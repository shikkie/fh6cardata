import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'

registerSW({
  // ── Approach 2: notify the app shell when a new SW is waiting ────────────
  // Instead of silently reloading (which surprises users mid-session on iOS),
  // we dispatch a custom event that UpdateBanner listens for.
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-need-refresh'))
  },

  // ── Approach 1/4: proactive polling for iOS installed apps ───────────────
  // iOS does not fire SW update events reliably for home-screen installs.
  // Calling registration.update() every 5 minutes forces iOS Safari to check
  // the SW file for changes and trigger onNeedRefresh when it differs.
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const FIVE_MINUTES = 5 * 60 * 1000
    setInterval(() => {
      registration.update().catch(() => { /* network offline — ignore */ })
    }, FIVE_MINUTES)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
