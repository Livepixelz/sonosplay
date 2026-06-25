import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { useToasts } from './stores/toasts';
import './style.css';

const pinia = createPinia();
const app = createApp(App).use(pinia);

const toasts = useToasts(pinia);

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (err) => toasts.error((err as Error).message ?? 'Erreur'),
    },
  },
});

app.use(VueQueryPlugin, { queryClient }).mount('#app');
