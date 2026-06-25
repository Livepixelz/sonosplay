<script setup lang="ts">
import { computed } from 'vue';
import { useDeviceMutations } from '../composables/useDeviceMutations';
import { useDeviceState } from '../composables/useDeviceState';
import { useGroups } from '../composables/useGroups';
import type { DeviceSummary } from '../types';
import EqControls from './EqControls.vue';
import GroupControls from './GroupControls.vue';
import PlaylistPicker from './PlaylistPicker.vue';
import QueueList from './QueueList.vue';
import SeekBar from './SeekBar.vue';
import TransportControls from './TransportControls.vue';
import VolumeSlider from './VolumeSlider.vue';

const props = defineProps<{
  device: DeviceSummary;
  allDevices: DeviceSummary[];
}>();

const { data: groups } = useGroups();

const { data, isError, isLoading } = useDeviceState(props.device.host);
const m = useDeviceMutations(props.device.host);

// Une enceinte injoignable (erreur de fetch sans donnée) est "offline".
const offline = computed(() => isError.value && !data.value);

const track = computed(() => data.value?.currentTrack ?? null);
const subtitle = computed(() => {
  const t = track.value;
  if (!t) return 'Rien en lecture';
  return [t.title, t.artist].filter(Boolean).join(' — ') || 'Piste en cours';
});
</script>

<template>
  <article class="card" :class="{ 'card--offline': offline }">
    <header class="card__head">
      <h2 class="card__name">{{ device.name || device.host }}</h2>
      <span class="card__status" :class="`card__status--${offline ? 'offline' : 'online'}`">
        {{ offline ? 'Hors ligne' : data?.transportState === 'PLAYING' ? 'Lecture' : 'En ligne' }}
      </span>
    </header>

    <div v-if="offline" class="card__offline">Enceinte injoignable.</div>

    <template v-else>
      <div class="card__track">
        <img
          v-if="track?.albumArtUri"
          :src="track.albumArtUri"
          alt=""
          class="card__art"
        />
        <div v-else class="card__art card__art--empty">♪</div>
        <p class="card__subtitle" :title="subtitle">
          <span v-if="isLoading && !data">Chargement…</span>
          <span v-else>{{ subtitle }}</span>
        </p>
      </div>

      <SeekBar
        :position="data?.positionSec ?? 0"
        :duration="data?.durationSec ?? 0"
        :playing="data?.transportState === 'PLAYING'"
        @seek="m.seek.mutate($event)"
      />

      <TransportControls
        :transport-state="data?.transportState ?? 'STOPPED'"
        @play="m.play.mutate()"
        @pause="m.pause.mutate()"
        @next="m.next.mutate()"
        @previous="m.previous.mutate()"
      />

      <div class="card__volume">
        <button
          class="card__mute"
          :class="{ 'card__mute--on': data?.mute }"
          :title="data?.mute ? 'Réactiver le son' : 'Couper le son'"
          @click="m.setMute.mutate(!data?.mute)"
        >
          {{ data?.mute ? '🔇' : '🔊' }}
        </button>
        <VolumeSlider
          :volume="data?.volume ?? 0"
          @update:volume="m.setVolume.mutate($event)"
        />
        <span class="card__vol-value">{{ data?.volume ?? 0 }}</span>
      </div>

      <GroupControls
        :device="device"
        :all-devices="allDevices"
        :groups="groups ?? []"
      />

      <PlaylistPicker :ip="device.host" @play="m.playPlaylist.mutate($event)" />

      <QueueList :ip="device.host" />

      <EqControls :ip="device.host" />
    </template>
  </article>
</template>
