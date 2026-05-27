import { defineConfig } from 'vite'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = dirname(fileURLToPath(import.meta.url))

const apiPort = process.env.FH6_API_PORT || '5002'
const apiTarget = `http://localhost:${apiPort}`
const uiPort = parseInt(process.env.FH6_UI_PORT || '3002')

// ── Approach 2/3: generate public/version.json at every build ─────────────
// The SW serves this file NetworkOnly so it is never cached.
// The app polls it every 5 minutes to detect new deployments independently
// of the SW update cycle (important on iOS where SW detection can be slow).
function buildVersionPlugin() {
  const buildTime = new Date().toISOString()
  // Short base-36 timestamp — changes on every build
  const version   = Date.now().toString(36)
  return {
    name: 'build-version',
    buildStart() {
      writeFileSync(
        resolve(__dirname, 'public', 'version.json'),
        JSON.stringify({ version, buildTime }, null, 2),
      )
    },
  }
}

export default defineConfig({
  // Expose build time to the JS bundle (used by update-banner label)
  define: {
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  plugins: [
    react(),
    buildVersionPlugin(),
    VitePWA({
      // ── Approach 1 & 2: prompt mode ──────────────────────────────────────
      // The SW activates immediately (skipWaiting + clientsClaim below), but
      // we show an in-app banner rather than silently reloading mid-session.
      // On iOS Brave/Safari home-screen installs this gives users a clear
      // "Refresh Now" tap instead of a surprising reload.
      registerType: 'prompt',

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
        // Approach 4: versioned start_url avoids iOS caching the old manifest URL
        start_url: '/?v=' + Date.now().toString(36),
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },

      workbox: {
        // ── Approach 1: aggressive SW takeover ───────────────────────────
        // skipWaiting: new SW activates the moment it finishes installing,
        //   without waiting for existing tabs to close. Critical for iOS
        //   home-screen installs where the app may run for days without
        //   a full browser restart.
        skipWaiting: true,

        // clientsClaim: activated SW immediately controls every open tab.
        //   Combined with skipWaiting this ensures the new code is in charge
        //   as soon as possible.
        clientsClaim: true,

        // Remove caches belonging to old SW versions on every activate.
        cleanupOutdatedCaches: true,

        // Precache everything except HTML (HTML is handled by NetworkFirst
        // runtimeCaching below) and version.json (always NetworkOnly).
        globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/version.json'],

        // Offline fallback for navigation when network is unreachable and
        // the NetworkFirst cache hasn't been populated yet (first-ever visit
        // while offline).  Exclude API routes from the fallback.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          // ── Approach 4: NetworkFirst for HTML navigation ────────────────
          // Always try the network for the app shell so that new HTML (which
          // references new JS/CSS hashes) loads immediately when online.
          // Falls back to the cached shell after 3 s so the app still opens
          // when offline.  This is the main iOS stale-cache fix.
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fh6-navigation',
              // iOS note: 3 s timeout balances freshness vs. slow connections.
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Approach 3: version.json is always fetched from the network ─
          // The SW never caches it so the polling in useAppVersion always
          // sees the latest build version.
          {
            urlPattern: /\/version\.json(\?.*)?$/,
            handler: 'NetworkOnly',
          },

          // API data: serve stale immediately, refresh in background.
          // The "Refresh Data" button deletes these caches on demand.
          {
            urlPattern: /^\/api\/cars(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fh6-cars-api',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^\/api\/filters$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fh6-filters-api',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^\/api\/parts(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fh6-parts-api',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
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
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
