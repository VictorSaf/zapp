import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow access from any IP address
  },
  build: {
    // Skip TypeScript checking during build
    minify: false,
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
