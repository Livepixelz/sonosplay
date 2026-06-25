import type {
  DeviceState,
  DeviceSummary,
  EqState,
  GroupInfo,
  PlaylistItem,
  QueueTrack,
} from '../types';

const BASE = '/api/devices';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // corps non-JSON : on garde le message HTTP générique
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const sonosApi = {
  discover: () => request<DeviceSummary[]>(BASE),

  state: (ip: string) => request<DeviceState>(`${BASE}/${ip}/state`),

  play: (ip: string) => request<{ ok: true }>(`${BASE}/${ip}/play`, { method: 'POST' }),
  pause: (ip: string) => request<{ ok: true }>(`${BASE}/${ip}/pause`, { method: 'POST' }),
  next: (ip: string) => request<{ ok: true }>(`${BASE}/${ip}/next`, { method: 'POST' }),
  previous: (ip: string) =>
    request<{ ok: true }>(`${BASE}/${ip}/previous`, { method: 'POST' }),

  setVolume: (ip: string, volume: number) =>
    request<{ ok: true }>(`${BASE}/${ip}/volume`, {
      method: 'POST',
      body: JSON.stringify({ volume }),
    }),

  setMute: (ip: string, mute: boolean) =>
    request<{ ok: true }>(`${BASE}/${ip}/mute`, {
      method: 'POST',
      body: JSON.stringify({ mute }),
    }),

  seek: (ip: string, position: number) =>
    request<{ ok: true }>(`${BASE}/${ip}/seek`, {
      method: 'POST',
      body: JSON.stringify({ position }),
    }),

  groups: () => request<GroupInfo[]>('/api/groups'),

  join: (ip: string, coordinatorUuid: string) =>
    request<{ ok: true }>(`${BASE}/${ip}/join`, {
      method: 'POST',
      body: JSON.stringify({ coordinatorUuid }),
    }),

  ungroup: (ip: string) =>
    request<{ ok: true }>(`${BASE}/${ip}/ungroup`, { method: 'POST' }),

  // File d'attente
  queue: (ip: string) => request<QueueTrack[]>(`${BASE}/${ip}/queue`),

  playQueueTrack: (ip: string, index: number) =>
    request<{ ok: true }>(`${BASE}/${ip}/queue/play`, {
      method: 'POST',
      body: JSON.stringify({ index }),
    }),

  removeQueueTrack: (ip: string, objectId: string) =>
    request<{ ok: true }>(`${BASE}/${ip}/queue/remove`, {
      method: 'POST',
      body: JSON.stringify({ objectId }),
    }),

  reorderQueueTrack: (ip: string, fromIndex: number, toIndex: number) =>
    request<{ ok: true }>(`${BASE}/${ip}/queue/reorder`, {
      method: 'POST',
      body: JSON.stringify({ fromIndex, toIndex }),
    }),

  // Égaliseur
  eq: (ip: string) => request<EqState>(`${BASE}/${ip}/eq`),

  setEq: (ip: string, patch: Partial<EqState>) =>
    request<{ ok: true }>(`${BASE}/${ip}/eq`, {
      method: 'POST',
      body: JSON.stringify(patch),
    }),

  // Volume de groupe (mode soirée)
  groupVolume: (ip: string) =>
    request<{ volume: number }>(`${BASE}/${ip}/group-volume`),

  setGroupVolume: (ip: string, volume: number) =>
    request<{ ok: true }>(`${BASE}/${ip}/group-volume`, {
      method: 'POST',
      body: JSON.stringify({ volume }),
    }),

  playlists: (ip: string) => request<PlaylistItem[]>(`${BASE}/${ip}/playlists`),
  favorites: (ip: string) => request<PlaylistItem[]>(`${BASE}/${ip}/favorites`),

  playPlaylist: (ip: string, uri: string, replaceQueue = true) =>
    request<{ ok: true }>(`${BASE}/${ip}/play-playlist`, {
      method: 'POST',
      body: JSON.stringify({ uri, replaceQueue }),
    }),
};
