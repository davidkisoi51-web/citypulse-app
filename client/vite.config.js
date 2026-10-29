import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/tests/globalUI.test.jsx'],
  },
 
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:5001',
      changeOrigin: true,
      secure: false,
    },
  },
},

})
