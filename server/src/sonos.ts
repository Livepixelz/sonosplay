import { SonosDevice, SonosManager } from '@svrooij/sonos';
import type { Track } from '@svrooij/sonos/lib/models/track.js';
import type {
  DeviceState,
  DeviceSummary,
  GroupInfo,
  PlaylistItem,
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

/** Convertit une réponse Browse en liste de PlaylistItem typée. */
function toPlaylistItems(result: Track[] | string): PlaylistItem[] {
  if (!Array.isArray(result)) return [];
  return result
    .filter((item): item is Track & { TrackUri: string } => Boolean(item.TrackUri))
    .map((item) => ({
      id: item.ItemId ?? item.TrackUri,
      title: item.Title ?? '(sans titre)',
      uri: item.TrackUri,
    }));
}

/** Playlists Sonos sauvegardées (ObjectID `SQ:`). */
export async function getPlaylists(host: string): Promise<PlaylistItem[]> {
  const response = await getDevice(host).ContentDirectoryService.Browse({
    ObjectID: 'SQ:',
    BrowseFlag: 'BrowseDirectChildren',
    Filter: '*',
    StartingIndex: 0,
    RequestedCount: 100,
    SortCriteria: '',
  });
  return toPlaylistItems(response.Result);
}

/** Favoris Sonos (radios, albums épinglés…). */
export async function getFavorites(host: string): Promise<PlaylistItem[]> {
  const response = await getDevice(host).GetFavorites();
  return toPlaylistItems(response.Result);
}

/**
 * Joue une playlist / un favori.
 * Par défaut on remplace la file d'attente puis on lance la lecture.
 */
export async function playPlaylist(
  host: string,
  uri: string,
  replaceQueue = true,
): Promise<void> {
  const device = getDevice(host);

  // Ajout simple à la file, sans toucher à la lecture en cours.
  if (!replaceQueue) {
    await device.AddUriToQueue(uri);
    return;
  }

  // Remplace la file et lance la lecture.
  await device.AVTransportService.RemoveAllTracksFromQueue();
  await device.AddUriToQueue(uri);
  const uuid = device.Uuid || (await device.LoadUuid());
  await device.SetAVTransportURI(`x-rincon-queue:${uuid}#0`);
  await device.Play();
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
