<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui';
import { computed, ref, watch } from 'vue';
import { useEq } from '../composables/useEq';

const props = defineProps<{
  ip: string;
}>();

const open = ref(false);
const { query, setEq } = useEq(props.ip, open);

const bass = ref(0);
const treble = ref(0);

// Resync depuis le serveur quand les données arrivent.
watch(
  () => query.data.value,
  (eq) => {
    if (eq) {
      bass.value = eq.bass;
      treble.value = eq.treble;
    }
  },
  { immediate: true },
);

const loudness = computed(() => query.data.value?.loudness ?? false);

let bassTimer: ReturnType<typeof setTimeout> | undefined;
function onBass(value: number[] | undefined): void {
  if (!value) return;
  bass.value = value[0] ?? 0;
  if (bassTimer) clearTimeout(bassTimer);
  bassTimer = setTimeout(() => setEq.mutate({ bass: bass.value }), 200);
}

let trebleTimer: ReturnType<typeof setTimeout> | undefined;
function onTreble(value: number[] | undefined): void {
  if (!value) return;
  treble.value = value[0] ?? 0;
  if (trebleTimer) clearTimeout(trebleTimer);
  trebleTimer = setTimeout(() => setEq.mutate({ treble: treble.value }), 200);
}
</script>

<template>
  <div class="eq">
    <button class="eq__toggle" @click="open = !open">
      {{ open ? '▾' : '▸' }} Égaliseur
    </button>

    <div v-if="open" class="eq__panel">
      <p v-if="query.isLoading.value" class="eq__hint">Chargement…</p>
      <template v-else>
        <label class="eq__row">
          <span class="eq__label">Graves</span>
          <SliderRoot
            class="eq__slider"
            :model-value="[bass]"
            :min="-10"
            :max="10"
            :step="1"
            @update:model-value="onBass"
          >
            <SliderTrack class="eq__track"><SliderRange class="eq__range" /></SliderTrack>
            <SliderThumb class="eq__thumb" aria-label="Graves" />
          </SliderRoot>
          <span class="eq__value">{{ bass > 0 ? `+${bass}` : bass }}</span>
        </label>

        <label class="eq__row">
          <span class="eq__label">Aigus</span>
          <SliderRoot
            class="eq__slider"
            :model-value="[treble]"
            :min="-10"
            :max="10"
            :step="1"
            @update:model-value="onTreble"
          >
            <SliderTrack class="eq__track"><SliderRange class="eq__range" /></SliderTrack>
            <SliderThumb class="eq__thumb" aria-label="Aigus" />
          </SliderRoot>
          <span class="eq__value">{{ treble > 0 ? `+${treble}` : treble }}</span>
        </label>

        <label class="eq__loudness">
          <input
            type="checkbox"
            :checked="loudness"
            @change="setEq.mutate({ loudness: ($event.target as HTMLInputElement).checked })"
          />
          Loudness
        </label>
      </template>
    </div>
  </div>
</template>
