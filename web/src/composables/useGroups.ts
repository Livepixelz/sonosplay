import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { sonosApi } from '../api/sonos';
import type { GroupInfo } from '../types';

export const GROUPS_KEY = ['groups'] as const;

/** Topologie des groupes multiroom, rafraîchie toutes les 5s. */
export function useGroups() {
  return useQuery<GroupInfo[]>({
    queryKey: GROUPS_KEY,
    queryFn: sonosApi.groups,
    refetchInterval: 5_000,
    retry: 1,
  });
}

/** Mutations de (dé)groupage, invalident la topologie. */
export function useGroupMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: GROUPS_KEY });

  const join = useMutation({
    mutationFn: ({ ip, coordinatorUuid }: { ip: string; coordinatorUuid: string }) =>
      sonosApi.join(ip, coordinatorUuid),
    onSuccess: invalidate,
  });

  const ungroup = useMutation({
    mutationFn: (ip: string) => sonosApi.ungroup(ip),
    onSuccess: invalidate,
  });

  return { join, ungroup };
}
