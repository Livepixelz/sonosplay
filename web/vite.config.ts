import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Le front parle à /api, proxifié vers le backend Node (port 3000 par défaut).
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
