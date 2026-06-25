/** Miroir des types du backend (server/src/types.ts). */

export interface DeviceSummary {
  host: string;
  name: string;
  uuid: string;
}

export interface TrackInfo {
  title: string | null;
  artist: string | null;
  album: string | null;
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
  positionSec: number;
  durationSec: number;
}

export interface ZoneMemberInfo {
  host: string;
  name: string;
  uuid: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  coordinator: ZoneMemberInfo;
  members: ZoneMemberInfo[];
}

export interface QueueTrack {
  id: string;
  title: string;
  artist: string | null;
  uri: string;
}

export interface EqState {
  bass: number;
  treble: number;
  loudness: boolean;
}

export interface PlaylistItem {
  id: string;
  title: string;
  uri: string;
  metadata: string;
}
