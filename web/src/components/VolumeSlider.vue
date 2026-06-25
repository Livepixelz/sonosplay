<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui';
import { ref, watch } from 'vue';

const props = defineProps<{
  volume: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:volume', value: number): void;
}>();

// État local (reka-ui attend un tableau de nombres).
const local = ref<number[]>([props.volume]);

// Resync quand le state serveur change, sauf si l'utilisateur est en train de glisser.
const dragging = ref(false);
watch(
  () => props.volume,
  (v) => {
    if (!dragging.value) local.value = [v];
  },
);

let timer: ReturnType<typeof setTimeout> | undefined;
function onValueChange(value: number[] | undefined): void {
  if (!value) return;
  local.value = value;
  dragging.value = true;
  const next = value[0] ?? 0;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    dragging.value = false;
    emit('update:volume', next);
  }, 200);
}
</script>

<template>
  <SliderRoot
    class="volume-slider"
    :model-value="local"
    :min="0"
    :max="100"
    :step="1"
    :disabled="disabled"
    @update:model-value="onValueChange"
  >
    <SliderTrack class="volume-slider__track">
      <SliderRange class="volume-slider__range" />
    </SliderTrack>
    <SliderThumb class="volume-slider__thumb" aria-label="Volume" />
  </SliderRoot>
</template>
