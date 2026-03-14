import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true
      }
    }
  }
})
