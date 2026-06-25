import { SonosDevice, SonosManager } from '@svrooij/sonos';
import XmlHelperModule from '@svrooij/sonos/lib/helpers/xml-helper.js';
import type { Track } from '@svrooij/sonos/lib/models/track.js';
import { parse as parseXml } from 'fast-xml-parser';

const XmlHelper = XmlHelperModule.default;
import type {
  DeviceState,
  DeviceSummary,
  EqState,
  GroupInfo,
  PlaylistItem,
  QueueTrack,
  TrackInfo,
  TransportState,
} from './types.js';

const SONOS_PORT = 1400;

/** Cache des SonosDevice instanciés à la volée par IP (hors découverte). */
const deviceCache = new Map<string, SonosDevice>();

/** Manager partagé pour la découverte SSDP du household. */
let manager: SonosManager | null = null;

/**
 * Découvre les enceintes du household via SSDP.
 * Réinitialise le manager à chaque appel pour refléter l'état réseau courant.
 */
export async function discoverDevices(): Promise<DeviceSummary[]> {
  manager = new SonosManager();
  const found = await manager.InitializeWithDiscovery(10);
  if (!found) {
    return [];
  }

  return Promise.all(
    manager.Devices.map(async (device) => {
      await device.LoadDeviceData();
      // On met aussi en cache pour les appels d'état suivants.
      deviceCache.set(device.Host, device);
      return {
        host: device.Host,
        name: device.Name,
        uuid: device.Uuid,
      } satisfies DeviceSummary;
    }),
  );
}

/** Récupère (ou crée) un SonosDevice pour une IP donnée. */
function getDevice(host: string): SonosDevice {
  let device = deviceCache.get(host);
  if (!device) {
    device = new SonosDevice(host, SONOS_PORT);
    deviceCache.set(host, device);
  }
  return device;
}

/** Préfixe les URIs de pochette relatives avec l'hôte de l'enceinte. */
function absoluteAlbumArt(host: string, uri: string | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  return `http://${host}:${SONOS_PORT}${uri.startsWith('/') ? '' : '/'}${uri}`;
}

/** Convertit une durée Sonos "H:MM:SS" en secondes (0 si invalide). */
function parseDuration(value: string | undefined): number {
  if (!value || value === 'NOT_IMPLEMENTED') return 0;
  const parts = value.split(':').map(Number);
  if (parts.length === 0 || parts.some((p) => Number.isNaN(p))) return 0;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** Convertit des secondes en "H:MM:SS" pour Seek. */
function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Transforme un Track sonos-ts en TrackInfo, ou null si vide. */
function toTrackInfo(host: string, meta: Track | string | undefined): TrackInfo | null {
  if (!meta || typeof meta === 'string') return null;
  const hasContent = meta.Title || meta.Artist || meta.Album;
  if (!hasContent) return null;
  return {
    title: meta.Title ?? null,
    artist: meta.Artist ?? null,
    album: meta.Album ?? null,
    albumArtUri: absoluteAlbumArt(host, meta.AlbumArtUri),
    duration: meta.Duration ?? null,
  };
}

export async function getDeviceState(host: string): Promise<DeviceState> {
  const device = getDevice(host);
  await device.LoadDeviceData();
  const state = await device.GetState();

  return {
    host,
    name: device.Name,
    volume: state.volume,
    mute: state.muted,
    transportState: state.transportState as TransportState,
    currentTrack: toTrackInfo(host, state.positionInfo.TrackMetaData),
    positionSec: parseDuration(state.positionInfo.RelTime),
    durationSec: parseDuration(state.positionInfo.TrackDuration),
  };
}

/** Déplace la lecture à `positionSec` secondes dans la piste courante. */
export async function seek(host: string, positionSec: number): Promise<void> {
  await getDevice(host).SeekPosition(formatSeconds(positionSec));
}

export async function play(host: string): Promise<void> {
  await getDevice(host).Play();
}

export async function pause(host: string): Promise<void> {
  await getDevice(host).Pause();
}

export async function next(host: string): Promise<void> {
  await getDevice(host).Next();
}

export async function previous(host: string): Promise<void> {
  await getDevice(host).Previous();
}

export async function setVolume(host: string, volume: number): Promise<void> {
  await getDevice(host).SetVolume(volume);
}

export async function setMute(host: string, mute: boolean): Promise<void> {
  await getDevice(host).RenderingControlService.SetMute({
    InstanceID: 0,
    Channel: 'Master',
    DesiredMute: mute,
  });
}

interface DidlItem {
  _id?: string;
  'dc:title'?: string;
  res?: string | { '#text'?: string };
  'r:resMD'?: string;
}

function resUri(res: DidlItem['res']): string {
  return typeof res === 'string' ? res : (res?.['#text'] ?? '');
}

/**
 * Browse brut + parsing DIDL maison : on garde le `r:resMD` (metadata réelle,
 * avec le `<desc>` du service musical) que la lib jette en parsant en Track.
 * `stopNodes` empêche fast-xml-parser de désérialiser le DIDL imbriqué du resMD,
 * qu'on récupère en string puis qu'on décode une fois (il est encodé en double).
 */
async function browseItems(host: string, objectId: string): Promise<PlaylistItem[]> {
  const response = await getDevice(host).ContentDirectoryService.Browse({
    ObjectID: objectId,
    BrowseFlag: 'BrowseDirectChildren',
    Filter: '*',
    StartingIndex: 0,
    RequestedCount: 100,
    SortCriteria: '',
  });
  const decoded = XmlHelper.DecodeXml(response.Result);
  if (!decoded) return [];
  const parsed = parseXml(decoded, {
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    parseNodeValue: false,
    parseAttributeValue: false,
    stopNodes: ['r:resMD'],
  }) as { 'DIDL-Lite'?: { item?: DidlItem | DidlItem[] } };
  const raw = parsed['DIDL-Lite']?.item;
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw])
    .map((item) => {
      // URI: décodée (entités XML only) ; la lib la ré-encode via EncodeTrackUri.
      // resMD: laissé échappé tel quel — la lib l'insère brut dans le SOAP.
      const uri = XmlHelper.DecodeXml(resUri(item.res)) ?? '';
      return {
        id: item._id ?? uri,
        title: XmlHelper.DecodeXml(item['dc:title']) ?? '(sans titre)',
        uri,
        metadata: typeof item['r:resMD'] === 'string' ? item['r:resMD'] : '',
      };
    })
    .filter((item) => item.uri.length > 0);
}

/** Playlists Sonos sauvegardées (ObjectID `SQ:`). */
export async function getPlaylists(host: string): Promise<PlaylistItem[]> {
  return browseItems(host, 'SQ:');
}

/** Favoris Sonos (radios, albums épinglés…). */
export async function getFavorites(host: string): Promise<PlaylistItem[]> {
  return browseItems(host, 'FV:2');
}

// Flux continus (radios) : non enqueuables, à poser directement comme transport URI.
const STREAM_PREFIXES = [
  'x-sonosapi-stream:',
  'x-sonosapi-radio:',
  'x-sonosapi-hls:',
  'x-rincon-mp3radio:',
  'x-sonosprog-http:',
];

function isStreamUri(uri: string): boolean {
  return STREAM_PREFIXES.some((prefix) => uri.startsWith(prefix));
}

/** Enfile une URI avec sa metadata ; sans metadata, on laisse la lib la deviner. */
async function enqueue(device: SonosDevice, uri: string, metadata: string): Promise<void> {
  if (!metadata) {
    await device.AddUriToQueue(uri);
    return;
  }
  await device.AVTransportService.AddURIToQueue({
    InstanceID: 0,
    EnqueuedURI: uri,
    EnqueuedURIMetaData: metadata,
    DesiredFirstTrackNumberEnqueued: 0,
    EnqueueAsNext: false,
  });
}

/**
 * Sonos renvoie UPnP 701 (Transition not available) si on Play() avant que le
 * transport soit prêt après un SetAVTransportURI (stream qui buffer, queue
 * fraîche). On réessaie une fois après un court délai.
 */
async function playWithRetry(device: SonosDevice): Promise<void> {
  try {
    await device.Play();
  } catch (err) {
    if (!/\b701\b/.test((err as Error).message ?? '')) throw err;
    await new Promise((r) => setTimeout(r, 500));
    await device.Play();
  }
}

/**
 * Joue une playlist / un favori.
 * Par défaut on remplace la file d'attente puis on lance la lecture.
 */
export async function playPlaylist(
  host: string,
  uri: string,
  replaceQueue = true,
  metadata = '',
): Promise<void> {
  const device = getDevice(host);

  // Une radio ne s'ajoute pas à la file : on la pose comme transport et on lit.
  if (isStreamUri(uri)) {
    // Stop préalable : sinon SetAVTransportURI sur transport actif déclenche
    // souvent UPnP 701 (Transition not available) au Play() qui suit.
    try {
      await device.Stop();
    } catch {
      /* déjà arrêté */
    }
    if (metadata) {
      await device.AVTransportService.SetAVTransportURI({
        InstanceID: 0,
        CurrentURI: uri,
        CurrentURIMetaData: metadata,
      });
    } else {
      await device.SetAVTransportURI(uri);
    }
    await playWithRetry(device);
    return;
  }

  // Ajout simple à la file, sans toucher à la lecture en cours.
  if (!replaceQueue) {
    await enqueue(device, uri, metadata);
    return;
  }

  // Remplace la file et lance la lecture.
  await device.AVTransportService.RemoveAllTracksFromQueue();
  await enqueue(device, uri, metadata);
  const uuid = device.Uuid || (await device.LoadUuid());
  if (!uuid) throw new Error('Impossible de récupérer l\'UUID de l\'enceinte');
  await device.SetAVTransportURI(`x-rincon-queue:${uuid}#0`);
  await playWithRetry(device);
}

/** Renvoie une enceinte connue (cache) ou en découvre une. */
async function anyDevice(): Promise<SonosDevice> {
  const cached = deviceCache.values().next().value;
  if (cached) return cached;
  await discoverDevices();
  const found = deviceCache.values().next().value;
  if (!found) throw new Error('Aucune enceinte connue pour lire la topologie');
  return found;
}

/** Topologie des groupes (multiroom) du household. */
export async function getGroups(): Promise<GroupInfo[]> {
  const device = await anyDevice();
  const zones = await device.GetZoneGroupState();
  return zones.map((zone) => ({
    id: zone.groupId,
    name: zone.name,
    coordinator: {
      host: zone.coordinator.host,
      name: zone.coordinator.name,
      uuid: zone.coordinator.uuid,
    },
    members: zone.members.map((m) => ({ host: m.host, name: m.name, uuid: m.uuid })),
  }));
}

/** Rattache une enceinte au groupe d'un coordinateur (par UUID). */
export async function joinGroup(host: string, coordinatorUuid: string): Promise<void> {
  await getDevice(host).AVTransportService.SetAVTransportURI({
    InstanceID: 0,
    CurrentURI: `x-rincon:${coordinatorUuid}`,
    CurrentURIMetaData: '',
  });
}

/** Sort l'enceinte de son groupe (devient autonome). */
export async function ungroup(host: string): Promise<void> {
  await getDevice(host).AVTransportService.BecomeCoordinatorOfStandaloneGroup();
}

// --- File d'attente -------------------------------------------------------

/** File d'attente courante de l'enceinte. */
export async function getQueue(host: string): Promise<QueueTrack[]> {
  const response = await getDevice(host).GetQueue();
  if (!Array.isArray(response.Result)) return [];
  return response.Result.filter(
    (item): item is typeof item & { TrackUri: string } => Boolean(item.TrackUri),
  ).map((item) => ({
    id: item.ItemId ?? item.TrackUri,
    title: item.Title ?? '(sans titre)',
    artist: item.Artist ?? null,
    uri: item.TrackUri,
  }));
}

/** Lance la lecture d'une piste précise de la file (index 0-based). */
export async function playQueueTrack(host: string, index: number): Promise<void> {
  const device = getDevice(host);
  await device.SeekTrack(index + 1);
  await device.Play();
}

/** Retire une piste de la file via son ObjectID (ex. "Q:0/3"). */
export async function removeQueueTrack(host: string, objectId: string): Promise<void> {
  await getDevice(host).AVTransportService.RemoveTrackFromQueue({
    InstanceID: 0,
    ObjectID: objectId,
    UpdateID: 0,
  });
}

/** Déplace une piste de la file (indices 0-based). */
export async function reorderQueueTrack(
  host: string,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  if (fromIndex === toIndex) return;
  // Positions Sonos en base 1 ; InsertBefore est évalué sur l'index d'origine,
  // donc on décale de 1 quand on descend la piste.
  const insertBefore = toIndex > fromIndex ? toIndex + 2 : toIndex + 1;
  await getDevice(host).AVTransportService.ReorderTracksInQueue({
    InstanceID: 0,
    StartingIndex: fromIndex + 1,
    NumberOfTracks: 1,
    InsertBefore: insertBefore,
    UpdateID: 0,
  });
}

// --- Égaliseur ------------------------------------------------------------

export async function getEq(host: string): Promise<EqState> {
  const device = getDevice(host);
  const [bass, treble, loudness] = await Promise.all([
    device.RenderingControlService.GetBass({ InstanceID: 0 }),
    device.RenderingControlService.GetTreble({ InstanceID: 0 }),
    device.RenderingControlService.GetLoudness({ InstanceID: 0, Channel: 'Master' }),
  ]);
  return {
    bass: bass.CurrentBass,
    treble: treble.CurrentTreble,
    loudness: loudness.CurrentLoudness,
  };
}

export async function setEq(host: string, eq: Partial<EqState>): Promise<void> {
  const device = getDevice(host);
  if (eq.bass !== undefined) {
    await device.RenderingControlService.SetBass({ InstanceID: 0, DesiredBass: eq.bass });
  }
  if (eq.treble !== undefined) {
    await device.RenderingControlService.SetTreble({
      InstanceID: 0,
      DesiredTreble: eq.treble,
    });
  }
  if (eq.loudness !== undefined) {
    await device.RenderingControlService.SetLoudness({
      InstanceID: 0,
      Channel: 'Master',
      DesiredLoudness: eq.loudness,
    });
  }
}

// --- Volume de groupe (mode soirée) --------------------------------------

/** Volume global d'un groupe (à appeler sur le coordinateur). */
export async function getGroupVolume(host: string): Promise<number> {
  const response = await getDevice(host).GroupRenderingControlService.GetGroupVolume({
    InstanceID: 0,
  });
  return response.CurrentVolume;
}

/** Règle le volume global d'un groupe (à appeler sur le coordinateur). */
export async function setGroupVolume(host: string, volume: number): Promise<void> {
  await getDevice(host).GroupRenderingControlService.SetGroupVolume({
    InstanceID: 0,
    DesiredVolume: volume,
  });
}
