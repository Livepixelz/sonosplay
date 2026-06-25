<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGroupMutations } from '../composables/useGroups';
import type { DeviceSummary, GroupInfo } from '../types';

const props = defineProps<{
  device: DeviceSummary;
  allDevices: DeviceSummary[];
  groups: GroupInfo[];
}>();

const { join, ungroup } = useGroupMutations();
const target = ref('');

/** Groupe auquel appartient cette enceinte. */
const myGroup = computed<GroupInfo | undefined>(() =>
  props.groups.find((g) => g.members.some((m) => m.uuid === props.device.uuid)),
);

/** Noms des autres enceintes du même groupe. */
const groupedWith = computed(() =>
  (myGroup.value?.members ?? [])
    .filter((m) => m.uuid !== props.device.uuid)
    .map((m) => m.name),
);

/** Enceintes que l'on peut rejoindre (toutes sauf celles déjà dans mon groupe). */
const joinable = computed(() => {
  const mine = new Set(myGroup.value?.members.map((m) => m.uuid) ?? [props.device.uuid]);
  return props.allDevices.filter((d) => !mine.has(d.uuid));
});

function onJoin(): void {
  const targetUuid = target.value;
  if (!targetUuid) return;
  // On rejoint le coordinateur du groupe de la cible.
  const targetGroup = props.groups.find((g) =>
    g.members.some((m) => m.uuid === targetUuid),
  );
  const coordinatorUuid = targetGroup?.coordinator.uuid ?? targetUuid;
  join.mutate({ ip: props.device.host, coordinatorUuid });
  target.value = '';
}
</script>

<template>
  <div class="group">
    <div class="group__status">
      <span v-if="groupedWith.length" class="group__badge">
        ⛓ Groupé avec {{ groupedWith.join(', ') }}
      </span>
      <span v-else class="group__badge group__badge--solo">Autonome</span>
      <button
        v-if="groupedWith.length"
        class="group__ungroup"
        :disabled="ungroup.isPending.value"
        @click="ungroup.mutate(device.host)"
      >
        Dégrouper
      </button>
    </div>

    <div v-if="joinable.length" class="group__join">
      <select v-model="target" class="group__select">
        <option value="" disabled>Jouer avec…</option>
        <option v-for="d in joinable" :key="d.uuid" :value="d.uuid">
          {{ d.name }}
        </option>
      </select>
      <button
        class="group__join-btn"
        :disabled="!target || join.isPending.value"
        @click="onJoin"
      >
        Grouper
      </button>
    </div>
  </div>
</template>
