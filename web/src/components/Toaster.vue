<script setup lang="ts">
import { useToasts } from '../stores/toasts';

const toasts = useToasts();
</script>

<template>
  <div class="toaster" role="status" aria-live="polite">
    <div
      v-for="t in toasts.items"
      :key="t.id"
      class="toaster__item"
      @click="toasts.remove(t.id)"
    >
      {{ t.message }}
    </div>
  </div>
</template>

<style scoped>
.toaster {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 22rem;
  pointer-events: none;
}
.toaster__item {
  background: #b00020;
  color: #fff;
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  pointer-events: auto;
}
</style>
