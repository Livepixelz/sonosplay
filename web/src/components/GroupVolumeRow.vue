<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGroupVolume } from '../composables/useGroupVolume';
import type { GroupInfo } from '../types';
import VolumeSlider from './VolumeSlider.vue';

const props = defineProps<{
  group: GroupInfo;
}>();

const { query, setVolume } = useGroupVolume(props.group.coordinator.host);

const volume = computed(() => query.data.value?.volume ?? 0);
const members = computed(() => props.group.members.map((m) => m.name).join(' · '));

// Affichage optimiste local pendant le réglage.
const local = ref(0);
const touched = ref(false);
watch(volume, (v) => {
  if (!touched.value) local.value = v;
});

function onChange(v: number): void {
  touched.value = true;
  local.value = v;
  setVolume.mutate(v, {
    onSettled: () => {
      touched.value = false;
    },
  });
}
</script>

<template>
  <div class="party__group">
    <div class="party__head">
      <span class="party__name">🎉 {{ group.name }}</span>
      <span class="party__members">{{ members }}</span>
    </div>
    <div class="party__slider-row">
      <span class="party__icon">🔊</span>
      <VolumeSlider :volume="local" @update:volume="onChange" />
      <span class="party__value">{{ local }}</span>
    </div>
  </div>
</template>
