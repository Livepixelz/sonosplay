import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
}

export const useToasts = defineStore('toasts', () => {
  const items = ref<Toast[]>([]);
  let nextId = 1;

  function error(message: string): void {
    const id = nextId++;
    items.value.push({ id, message });
    setTimeout(() => remove(id), 5000);
  }

  function remove(id: number): void {
    items.value = items.value.filter((t) => t.id !== id);
  }

  return { items, error, remove };
});
