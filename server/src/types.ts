/**
 * Types partagés entre les routes du backend.
 * Le frontend possède une copie miroir dans web/src/types.ts.
 */

export interface DeviceSummary {
  /** Adresse IPv4 de l'enceinte sur le LAN. */
  host: string;
  /** Nom de la pièce (ex. "Salon"). */
  name: string;
  /** UUID Sonos (RINCON_...). */
  uuid: string;
}

export interface TrackInfo {
  title: string | null;
  artist: string | null;
  album: string | null;
  /** URL absolue de la pochette (déjà préfixée avec http://host:1400). */
  albumArtUri: string | null;
  duration: string | null;
}

export type TransportState =
  | 'PLAYING'
  | 'PAUSED_PLAYBACK'
  | 'STOPPED'
  | 'TRANSITIONING'
  | 'NO_MEDIA_PRESENT';

export interface DeviceState {
  host: string;
  name: string;
  volume: number;
  mute: boolean;
  transportState: TransportState;
  currentTrack: TrackInfo | null;
}

export interface PlaylistItem {
  id: string;
  title: string;
  /** URI à passer à POST /play-playlist. */
  uri: string;
}
