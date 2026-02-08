import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React and core libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // Router
          if (id.includes('react-router')) {
            return 'router';
          }
          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'ui-components';
          }
          // Markdown and syntax highlighting
          if (id.includes('react-markdown') || id.includes('react-syntax-highlighter')) {
            return 'markdown';
          }
          if (id.includes('katex') || id.includes('rehype-katex') || id.includes('remark-math')) {
            return 'math';
          }
          // Utility libraries
          if (id.includes('axios')) {
            return 'axios';
          }
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          if (id.includes('valtio')) {
            return 'valtio';
          }
          // TanStack Query
          if (id.includes('@tanstack')) {
            return 'tanstack';
          }
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Large dependencies
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
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