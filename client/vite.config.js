import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    VitePWA({
    registerStrategy: 'autoUpdate',
    injectRegister: 'null',
    manifest: false,
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      cleanupOutdatedCaches: true,
    },
  })],
  test: {
    environment: 'jsdom',
    include: ['src/tests/globalUI.test.jsx'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
