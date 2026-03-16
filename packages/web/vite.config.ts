import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/party-music-sync/',
  plugins: [react()],
  resolve: {
    alias: {
      '@partylight/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
});
