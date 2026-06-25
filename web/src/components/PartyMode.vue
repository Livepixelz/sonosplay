<script setup lang="ts">
import { computed } from 'vue';
import type { GroupInfo } from '../types';
import GroupVolumeRow from './GroupVolumeRow.vue';

const props = defineProps<{
  groups: GroupInfo[];
}>();

// Seuls les groupes de 2 enceintes ou plus ont un intérêt "soirée".
const partyGroups = computed(() => props.groups.filter((g) => g.members.length > 1));
</script>

<template>
  <section v-if="partyGroups.length" class="party">
    <h2 class="party__title">Mode soirée — volume de groupe</h2>
    <div class="party__list">
      <GroupVolumeRow v-for="g in partyGroups" :key="g.id" :group="g" />
    </div>
  </section>
</template>
