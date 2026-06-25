<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui';
import { computed, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  position: number;
  duration: number;
  playing: boolean;
}>();

const emit = defineEmits<{
  (e: 'seek', value: number): void;
}>();

const local = ref(props.position);
const dragging = ref(false);

// Resync sur le state serveur (sauf pendant un drag).
watch(
  () => props.position,
  (p) => {
    if (!dragging.value) local.value = p;
  },
);

// Tick local chaque seconde pour une barre fluide entre deux refetch.
const timer = setInterval(() => {
  if (props.playing && !dragging.value && local.value < props.duration) {
    local.value += 1;
  }
}, 1000);
onUnmounted(() => clearInterval(timer));

const hasDuration = computed(() => props.duration > 0);
const model = computed<number[]>(() => [Math.min(local.value, props.duration)]);

function fmt(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function onChange(value: number[] | undefined): void {
  if (!value) return;
  dragging.value = true;
  local.value = value[0] ?? 0;
}

function onCommit(value: number[] | undefined): void {
  dragging.value = false;
  const target = value?.[0] ?? local.value;
  emit('seek', Math.round(target));
}
</script>

<template>
  <div class="seek">
    <span class="seek__time">{{ fmt(local) }}</span>
    <SliderRoot
      class="seek__slider"
      :model-value="model"
      :min="0"
      :max="Math.max(hasDuration ? duration : 1, 1)"
      :step="1"
      :disabled="!hasDuration"
      @update:model-value="onChange"
      @value-commit="onCommit"
    >
      <SliderTrack class="seek__track">
        <SliderRange class="seek__range" />
      </SliderTrack>
      <SliderThumb class="seek__thumb" aria-label="Position" />
    </SliderRoot>
    <span class="seek__time">{{ hasDuration ? fmt(duration) : '--:--' }}</span>
  </div>
</template>
