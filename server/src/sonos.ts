import { SonosDevice, SonosManager } from '@svrooij/sonos';
import type { Track } from '@svrooij/sonos/lib/models/track.js';
import type {
  DeviceState,
  DeviceSummary,
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
  };
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

  if (replaceQueue) {
    await device.AVTransportService.RemoveAllTracksFromQueue();
  }
  await device.AddUriToQueue(uri);

  const uuid = device.Uuid || (await device.LoadUuid());
  await device.SetAVTransportURI(`x-rincon-queue:${uuid}#0`);
  await device.Play();
}
