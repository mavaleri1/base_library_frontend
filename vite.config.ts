import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  build: {
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'esbuild'
  },
  server: {
    host: true,
    port: 3001,
    proxy: {
      // Local development - Artifacts Service (port 8001)
      '/api/process': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/upload-images': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/hitl': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/materials': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/threads': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/users': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // auth/me lives at /api/auth/me in artifacts-service - do NOT rewrite /api
      '/api/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/state': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Prompt Config Service - local (port 8002)
      '/api/v1': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
})