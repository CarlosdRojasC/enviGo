import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
   server: {
    // Esta es la sección que debes añadir
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      allowedHosts: ['.ngrok-free.app']
    },
    // Y esta es la configuración específica para el error
    host: true,
    watch: {
      usePolling: true
    }
  }
})
