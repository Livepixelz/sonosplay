<script setup lang="ts">
import { computed } from 'vue';
import SpeakerCard from './components/SpeakerCard.vue';
import { useDevices } from './composables/useDevices';

const { data, isLoading, isError, error, refetch, isFetching } = useDevices();

const devices = computed(() => data.value ?? []);
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1>SonosPlay</h1>
      <button class="app__refresh" :disabled="isFetching" @click="refetch()">
        {{ isFetching ? '…' : '⟳' }} Rafraîchir
      </button>
    </header>

    <p v-if="isLoading" class="app__msg">Découverte des enceintes…</p>
    <p v-else-if="isError" class="app__msg app__msg--error">
      Erreur de découverte : {{ (error as Error)?.message }}
    </p>
    <p v-else-if="devices.length === 0" class="app__msg">
      Aucune enceinte trouvée. Vérifie que tu es sur le même réseau local.
    </p>

    <section v-else class="grid">
      <SpeakerCard
        v-for="d in devices"
        :key="d.uuid || d.host"
        :device="d"
        :all-devices="devices"
      />
    </section>
  </div>
</template>
