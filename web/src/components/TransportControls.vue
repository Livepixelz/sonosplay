<script setup lang="ts">
import type { TransportState } from '../types';

defineProps<{
  transportState: TransportState;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'play'): void;
  (e: 'pause'): void;
  (e: 'next'): void;
  (e: 'previous'): void;
}>();
</script>

<template>
  <div class="transport">
    <button
      class="transport__btn"
      :disabled="disabled"
      title="Précédent"
      @click="emit('previous')"
    >
      ⏮
    </button>

    <button
      v-if="transportState === 'PLAYING'"
      class="transport__btn transport__btn--primary"
      :disabled="disabled"
      title="Pause"
      @click="emit('pause')"
    >
      ⏸
    </button>
    <button
      v-else
      class="transport__btn transport__btn--primary"
      :disabled="disabled"
      title="Lecture"
      @click="emit('play')"
    >
      ▶
    </button>

    <button
      class="transport__btn"
      :disabled="disabled"
      title="Suivant"
      @click="emit('next')"
    >
      ⏭
    </button>
  </div>
</template>
