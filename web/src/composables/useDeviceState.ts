import { useQuery } from '@tanstack/vue-query';
import { sonosApi } from '../api/sonos';
import type { DeviceState } from '../types';

export function deviceStateKey(ip: string): readonly unknown[] {
  return ['device-state', ip];
}

/** État courant d'une enceinte, rafraîchi toutes les 2s. */
export function useDeviceState(ip: string) {
  return useQuery<DeviceState>({
    queryKey: deviceStateKey(ip),
    queryFn: () => sonosApi.state(ip),
    refetchInterval: 2_000,
    // Pas de retry agressif : une enceinte injoignable doit passer "offline" vite.
    retry: 1,
  });
}
