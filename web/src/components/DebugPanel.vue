<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { ref } from 'vue';
import { sonosApi } from '../api/sonos';
import type { DeviceSummary } from '../types';

const props = defineProps<{ devices: DeviceSummary[] }>();

const selectedIp = ref<string>(props.devices[0]?.host ?? '');
const customUri = ref<string>('');
const customMeta = ref<string>('');

const state = useQuery({
  queryKey: ['debug-state', selectedIp],
  queryFn: () => sonosApi.state(selectedIp.value),
  enabled: () => !!selectedIp.value,
  refetchInterval: 2000,
});

const favorites = useQuery({
  queryKey: ['debug-favorites', selectedIp],
  queryFn: () => sonosApi.favorites(selectedIp.value),
  enabled: () => !!selectedIp.value,
});

const playlists = useQuery({
  queryKey: ['debug-playlists', selectedIp],
  queryFn: () => sonosApi.playlists(selectedIp.value),
  enabled: () => !!selectedIp.value,
});

const queue = useQuery({
  queryKey: ['debug-queue', selectedIp],
  queryFn: () => sonosApi.queue(selectedIp.value),
  enabled: () => !!selectedIp.value,
});

const groups = useQuery({
  queryKey: ['debug-groups'],
  queryFn: () => sonosApi.groups(),
});

async function tryPlay(uri: string, metadata = ''): Promise<void> {
  await sonosApi.playPlaylist(selectedIp.value, uri, true, metadata);
}

function fmt(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
</script>

<template>
  <div class="debug">
    <h2>Debug</h2>

    <label class="debug__row">
      Enceinte :
      <select v-model="selectedIp">
        <option v-for="d in devices" :key="d.host" :value="d.host">
          {{ d.name }} — {{ d.host }}
        </option>
      </select>
    </label>

    <section>
      <h3>État ({{ state.isFetching.value ? '…' : 'live' }})</h3>
      <pre>{{ state.data.value ? fmt(state.data.value) : state.error.value?.message ?? '—' }}</pre>
    </section>

    <section>
      <h3>Jouer une URI brute</h3>
      <p class="debug__hint">
        Test direct via <code>POST /play-playlist</code>. Utile pour tester un flux HTTP
        direct (ex&nbsp;: <code>x-rincon-mp3radio://direct.franceinter.fr/live/franceinter-midfi.mp3</code>)
        quand un favori TuneIn ne répond plus.
      </p>
      <input v-model="customUri" placeholder="URI (x-sonosapi-stream:… ou x-rincon-mp3radio://…)" />
      <textarea v-model="customMeta" rows="2" placeholder="Metadata DIDL (optionnel)" />
      <button :disabled="!customUri" @click="tryPlay(customUri, customMeta)">▶ Jouer</button>
    </section>

    <section>
      <h3>Favoris ({{ favorites.data.value?.length ?? 0 }})</h3>
      <table v-if="favorites.data.value?.length">
        <thead>
          <tr><th>Titre</th><th>URI</th><th>id / metadata</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="f in favorites.data.value" :key="f.id">
            <td>{{ f.title }}</td>
            <td><code>{{ f.uri }}</code></td>
            <td><details><summary>{{ f.id }}</summary><pre>{{ f.metadata }}</pre></details></td>
            <td><button @click="tryPlay(f.uri, f.metadata)">▶</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="debug__hint">Aucun favori.</p>
    </section>

    <section>
      <h3>Playlists ({{ playlists.data.value?.length ?? 0 }})</h3>
      <ul v-if="playlists.data.value?.length">
        <li v-for="p in playlists.data.value" :key="p.id">
          {{ p.title }} <code>{{ p.uri }}</code>
        </li>
      </ul>
      <p v-else class="debug__hint">Aucune playlist.</p>
    </section>

    <section>
      <h3>File ({{ queue.data.value?.length ?? 0 }})</h3>
      <pre v-if="queue.data.value">{{ fmt(queue.data.value) }}</pre>
    </section>

    <section>
      <h3>Groupes</h3>
      <pre>{{ groups.data.value ? fmt(groups.data.value) : '—' }}</pre>
    </section>
  </div>
</template>

<style scoped>
.debug {
  background: #0f0f10;
  border: 1px solid #2a2a2c;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  color: #e8e8e8;
  font-size: 0.85rem;
}
.debug h2 { margin: 0 0 0.75rem; }
.debug h3 { margin: 1rem 0 0.4rem; font-size: 0.95rem; color: #9cdcfe; }
.debug__row { display: flex; gap: 0.5rem; align-items: center; }
.debug__hint { color: #888; font-size: 0.8rem; margin: 0.25rem 0; }
.debug section { margin-top: 1rem; }
.debug pre {
  background: #1a1a1c;
  padding: 0.5rem;
  border-radius: 4px;
  overflow: auto;
  max-height: 16rem;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
}
.debug code { background: #1a1a1c; padding: 1px 4px; border-radius: 3px; }
.debug input, .debug textarea {
  width: 100%;
  background: #1a1a1c;
  border: 1px solid #333;
  color: #e8e8e8;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  margin: 0.25rem 0;
}
.debug button {
  background: #2a5; color: #fff; border: 0; padding: 0.35rem 0.7rem;
  border-radius: 4px; cursor: pointer; font-size: 0.8rem;
}
.debug button:disabled { background: #333; cursor: not-allowed; }
.debug table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
.debug th, .debug td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #222; vertical-align: top; }
.debug details summary { cursor: pointer; }
</style>
