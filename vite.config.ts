import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this site at /Flash/, so all asset URLs must be
  // prefixed with that base path. Without it, the built JS/CSS 404 and the
  // page stays white.
  base: '/Flash/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
