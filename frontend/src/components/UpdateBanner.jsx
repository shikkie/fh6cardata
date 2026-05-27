/**
 * Approach 2: In-app update banner.
 *
 * Listens for:
 *  (a) the `pwa-need-refresh` custom event dispatched by the SW registration
 *      callback in main.jsx  (works on Android / desktop Chrome / Firefox)
 *  (b) updateAvailable from useAppVersion   (fallback for iOS Safari where
 *      SW events may not fire promptly for home-screen installed apps)
 *
 * Shows a sticky banner at the top of the screen.  The user can tap
 * "Refresh Now" to reload (picking up the new SW + new HTML/JS) or
 * "Later" to dismiss for this build.
 */
import { useEffect, useState } from 'react'
import { useAppVersion } from '../hooks/useAppVersion'

export default function UpdateBanner() {
  const [swNeedsRefresh, setSwNeedsRefresh] = useState(false)
  const { updateAvailable, applyUpdate, dismiss } = useAppVersion()

  useEffect(() => {
    function onSwUpdate() { setSwNeedsRefresh(true) }
    window.addEventListener('pwa-need-refresh', onSwUpdate)
    return () => window.removeEventListener('pwa-need-refresh', onSwUpdate)
  }, [])

  const show = swNeedsRefresh || updateAvailable
  if (!show) return null

  function handleRefreshNow() {
    applyUpdate()  // updates localStorage + reloads
  }

  function handleLater() {
    setSwNeedsRefresh(false)
    dismiss()
  }

  return (
    <div className="update-banner d-flex align-items-center justify-content-between px-3 py-2" role="alert">
      <span>
        <i className="fa-solid fa-rotate me-2" aria-hidden="true" />
        App update available
      </span>
      <div className="d-flex gap-2">
        <button
          className="btn btn-sm btn-warning fw-semibold"
          onClick={handleRefreshNow}
        >
          Refresh Now
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={handleLater}
          aria-label="Dismiss update banner"
        >
          Later
        </button>
      </div>
    </div>
  )
}
