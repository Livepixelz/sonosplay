import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { DeviceSummary } from '../types';

/**
 * Store des enceintes découvertes. L'état temps réel de chaque enceinte
 * (volume, piste, etc.) est géré par Vue Query, pas ici — ce store ne garde
 * que la liste des appareils du household.
 */
export const useSonosStore = defineStore('sonos', () => {
  const devices = ref<DeviceSummary[]>([]);

  function setDevices(list: DeviceSummary[]): void {
    devices.value = list;
  }

  return { devices, setDevices };
});
