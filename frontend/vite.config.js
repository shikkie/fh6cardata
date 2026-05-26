import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiPort = process.env.FH6_API_PORT || '5002'
const apiTarget = `http://localhost:${apiPort}`

const uiPort = parseInt(process.env.FH6_UI_PORT || '3002')

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: uiPort,
    allowedHosts: ['bandit', 'localhost'],
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
