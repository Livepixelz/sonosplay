import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, type Ref } from 'vue';
import { sonosApi } from '../api/sonos';
import type { QueueTrack } from '../types';

function queueKey(ip: string): readonly unknown[] {
  return ['queue', ip];
}

/** File d'attente d'une enceinte, chargée à la demande (`enabled`). */
export function useQueue(ip: string, enabled: Ref<boolean>) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queueKey(ip) });

  const query = useQuery<QueueTrack[]>({
    queryKey: queueKey(ip),
    queryFn: () => sonosApi.queue(ip),
    enabled,
    refetchInterval: computed(() => (enabled.value ? 5_000 : false)),
  });

  const playTrack = useMutation({
    mutationFn: (index: number) => sonosApi.playQueueTrack(ip, index),
  });

  const removeTrack = useMutation({
    mutationFn: (objectId: string) => sonosApi.removeQueueTrack(ip, objectId),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) =>
      sonosApi.reorderQueueTrack(ip, fromIndex, toIndex),
    onSuccess: invalidate,
  });

  return { query, playTrack, removeTrack, reorder };
}
