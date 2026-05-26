import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiPort = process.env.FH6_API_PORT || '5000'
const apiTarget = `http://localhost:${apiPort}`

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
