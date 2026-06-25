import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { type Ref } from 'vue';
import { sonosApi } from '../api/sonos';
import type { EqState } from '../types';

function eqKey(ip: string): readonly unknown[] {
  return ['eq', ip];
}

/** Réglages d'égaliseur (graves / aigus / loudness), chargés à la demande. */
export function useEq(ip: string, enabled: Ref<boolean>) {
  const queryClient = useQueryClient();

  const query = useQuery<EqState>({
    queryKey: eqKey(ip),
    queryFn: () => sonosApi.eq(ip),
    enabled,
    staleTime: 10_000,
  });

  const setEq = useMutation({
    mutationFn: (patch: Partial<EqState>) => sonosApi.setEq(ip, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eqKey(ip) }),
  });

  return { query, setEq };
}
