import { useQuery } from '@tanstack/vue-query';
import { watch } from 'vue';
import { sonosApi } from '../api/sonos';
import { useSonosStore } from '../stores/sonos';

/** Découverte SSDP des enceintes, synchronisée dans le store Pinia. */
export function useDevices() {
  const store = useSonosStore();

  const query = useQuery({
    queryKey: ['devices'],
    queryFn: sonosApi.discover,
    staleTime: 30_000,
  });

  watch(
    query.data,
    (devices) => {
      if (devices) store.setDevices(devices);
    },
    { immediate: true },
  );

  return query;
}
