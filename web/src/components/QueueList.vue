<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQueue } from '../composables/useQueue';

const props = defineProps<{
  ip: string;
}>();

const open = ref(false);
const { query, playTrack, removeTrack, reorder } = useQueue(props.ip, open);

const tracks = computed(() => query.data.value ?? []);

// Drag & drop natif.
const dragIndex = ref<number | null>(null);
const overIndex = ref<number | null>(null);

function onDragStart(index: number): void {
  dragIndex.value = index;
}

function onDragOver(index: number, event: DragEvent): void {
  event.preventDefault();
  overIndex.value = index;
}

function onDrop(index: number): void {
  const from = dragIndex.value;
  dragIndex.value = null;
  overIndex.value = null;
  if (from === null || from === index) return;
  reorder.mutate({ fromIndex: from, toIndex: index });
}

function onDragEnd(): void {
  dragIndex.value = null;
  overIndex.value = null;
}
</script>

<template>
  <div class="queue">
    <button class="queue__toggle" @click="open = !open">
      {{ open ? '▾' : '▸' }} File d'attente
    </button>

    <div v-if="open" class="queue__panel">
      <p v-if="query.isLoading.value" class="queue__hint">Chargement…</p>
      <p v-else-if="tracks.length === 0" class="queue__hint">File vide.</p>
      <ul v-else class="queue__list">
        <li
          v-for="(t, i) in tracks"
          :key="t.id"
          class="queue__item"
          :class="{ 'queue__item--over': overIndex === i, 'queue__item--drag': dragIndex === i }"
          draggable="true"
          @dragstart="onDragStart(i)"
          @dragover="onDragOver(i, $event)"
          @drop="onDrop(i)"
          @dragend="onDragEnd"
        >
          <span class="queue__grip" title="Glisser pour réordonner">⠿</span>
          <button
            class="queue__play"
            title="Lire cette piste"
            @click="playTrack.mutate(i)"
          >
            <span class="queue__title">{{ t.title }}</span>
            <span v-if="t.artist" class="queue__artist">{{ t.artist }}</span>
          </button>
          <button
            class="queue__remove"
            title="Retirer de la file"
            @click="removeTrack.mutate(t.id)"
          >
            ✕
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
