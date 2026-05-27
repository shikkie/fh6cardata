import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const apiPort = process.env.FH6_API_PORT || '5002'
const apiTarget = `http://localhost:${apiPort}`

const uiPort = parseInt(process.env.FH6_UI_PORT || '3002')

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'FH6 Car Data — Auction House Companion',
        short_name: 'FH6 Cars',
        description: 'Browse, filter, and track Forza Horizon 6 cars. Includes auction pricing, tuning parts, and garage management.',
        theme_color: '#0d0d0d',
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache static assets (JS, CSS, fonts, images)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Cache API responses for offline use
        runtimeCaching: [
          {
            urlPattern: /^\/api\/cars(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fh6-cars-api',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^\/api\/filters$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fh6-filters-api',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^\/api\/parts(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fh6-parts-api',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
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
