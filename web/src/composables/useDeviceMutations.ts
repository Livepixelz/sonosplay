import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { sonosApi } from '../api/sonos';
import { deviceStateKey } from './useDeviceState';

/**
 * Mutations transport / volume / mute / playlists pour une enceinte.
 * Chaque succès invalide le state de l'enceinte pour resynchroniser l'UI.
 */
export function useDeviceMutations(ip: string) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: deviceStateKey(ip) });

  const play = useMutation({ mutationFn: () => sonosApi.play(ip), onSuccess: invalidate });
  const pause = useMutation({ mutationFn: () => sonosApi.pause(ip), onSuccess: invalidate });
  const next = useMutation({ mutationFn: () => sonosApi.next(ip), onSuccess: invalidate });
  const previous = useMutation({
    mutationFn: () => sonosApi.previous(ip),
    onSuccess: invalidate,
  });

  const setVolume = useMutation({
    mutationFn: (volume: number) => sonosApi.setVolume(ip, volume),
    onSuccess: invalidate,
  });

  const setMute = useMutation({
    mutationFn: (mute: boolean) => sonosApi.setMute(ip, mute),
    onSuccess: invalidate,
  });

  const seek = useMutation({
    mutationFn: (position: number) => sonosApi.seek(ip, position),
    onSuccess: invalidate,
  });

  const playPlaylist = useMutation({
    mutationFn: ({ uri, replaceQueue }: { uri: string; replaceQueue: boolean }) =>
      sonosApi.playPlaylist(ip, uri, replaceQueue),
    onSuccess: invalidate,
  });

  return { play, pause, next, previous, setVolume, setMute, seek, playPlaylist };
}
