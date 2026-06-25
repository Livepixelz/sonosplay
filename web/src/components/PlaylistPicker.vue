<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { computed, ref } from 'vue';
import { sonosApi } from '../api/sonos';

const props = defineProps<{
  ip: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'play', uri: string): void;
}>();

const open = ref(false);
const selected = ref<string>('');

const playlists = useQuery({
  queryKey: computed(() => ['playlists', props.ip]),
  queryFn: () => sonosApi.playlists(props.ip),
  enabled: open,
});

const favorites = useQuery({
  queryKey: computed(() => ['favorites', props.ip]),
  queryFn: () => sonosApi.favorites(props.ip),
  enabled: open,
});

const loading = computed(() => playlists.isLoading.value || favorites.isLoading.value);

function onPlay(): void {
  if (selected.value) emit('play', selected.value);
}
</script>

<template>
  <div class="playlists">
    <button class="playlists__toggle" :disabled="disabled" @click="open = !open">
      {{ open ? '▾' : '▸' }} Playlists & favoris
    </button>

    <div v-if="open" class="playlists__panel">
      <p v-if="loading" class="playlists__hint">Chargement…</p>
      <template v-else>
        <select v-model="selected" class="playlists__select">
          <option value="" disabled>Choisir…</option>
          <optgroup v-if="playlists.data.value?.length" label="Playlists Sonos">
            <option v-for="p in playlists.data.value" :key="p.id" :value="p.uri">
              {{ p.title }}
            </option>
          </optgroup>
          <optgroup v-if="favorites.data.value?.length" label="Favoris">
            <option v-for="f in favorites.data.value" :key="f.id" :value="f.uri">
              {{ f.title }}
            </option>
          </optgroup>
        </select>
        <button
          class="playlists__play"
          :disabled="!selected || disabled"
          @click="onPlay"
        >
          Jouer
        </button>
        <p
          v-if="!playlists.data.value?.length && !favorites.data.value?.length"
          class="playlists__hint"
        >
          Aucune playlist ni favori.
        </p>
      </template>
    </div>
  </div>
</template>
