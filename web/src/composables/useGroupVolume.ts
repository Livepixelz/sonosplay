import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { sonosApi } from '../api/sonos';

/** Volume global d'un groupe, piloté via son coordinateur. */
export function useGroupVolume(coordinatorHost: string) {
  const queryClient = useQueryClient();
  const key = ['group-volume', coordinatorHost];

  const query = useQuery({
    queryKey: key,
    queryFn: () => sonosApi.groupVolume(coordinatorHost),
    refetchInterval: 5_000,
    retry: 1,
  });

  const setVolume = useMutation({
    mutationFn: (volume: number) => sonosApi.setGroupVolume(coordinatorHost, volume),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { query, setVolume };
}
