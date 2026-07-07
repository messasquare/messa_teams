import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['lucide-react', 'sonner'],
          'socket': ['socket.io-client'],
          'dnd': ['@hello-pangea/dnd'],
          'emoji': ['emoji-picker-react'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge', 'axios', 'zustand'],
        },
      },
    },
  },
})