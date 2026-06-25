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
  /** Position de lecture courante, en secondes (0 si inconnue). */
  positionSec: number;
  /** Durée de la piste, en secondes (0 si inconnue / flux continu). */
  durationSec: number;
}

export interface ZoneMemberInfo {
  host: string;
  name: string;
  uuid: string;
}

export interface GroupInfo {
  id: string;
  /** Nom du groupe (ex. "Salon + Cuisine"). */
  name: string;
  coordinator: ZoneMemberInfo;
  members: ZoneMemberInfo[];
}

export interface PlaylistItem {
  id: string;
  title: string;
  /** URI à passer à POST /play-playlist. */
  uri: string;
  /** Metadata DIDL (resMD) à renvoyer telle quelle pour l'enqueue. */
  metadata: string;
}

export interface QueueTrack {
  /** ObjectID de la file (ex. "Q:0/3"), utilisé pour supprimer la piste. */
  id: string;
  title: string;
  artist: string | null;
  uri: string;
}

export interface EqState {
  /** Graves, -10..10. */
  bass: number;
  /** Aigus, -10..10. */
  treble: number;
  /** Loudness (compensation à bas volume). */
  loudness: boolean;
}
