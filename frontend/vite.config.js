import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true, // Mengekspos ke jaringan (LAN/WIFI) secara otomatis
    proxy: {
      // Proxy semua request /api ke PHP backend
      // Path /api/auth.php → http://localhost:8000/api/auth.php
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        xfwd: true, // Meneruskan IP asli dari client (X-Forwarded-For) ke backend PHP
      },
    },
  },
})
