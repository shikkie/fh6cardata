/**
 * Approach 3: API-driven version detection.
 *
 * /version.json is generated at build time and is served NetworkOnly by the
 * SW (never cached).  This hook polls it every 5 minutes; when the stored
 * version in localStorage differs from the fetched one, it signals that a
 * new deployment is available.
 *
 * This works independently of the SW update mechanism so it also catches
 * cases where the SW itself has not yet detected the update (common on iOS).
 */
import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL = 5 * 60 * 1000  // 5 minutes
const LS_KEY = 'fh6-app-version'

async function fetchVersion() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const { version } = await res.json()
    return version ?? null
  } catch {
    return null  // offline or not deployed yet
  }
}

export function useAppVersion() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const storedRef = useRef(localStorage.getItem(LS_KEY))

  async function check() {
    const latest = await fetchVersion()
    if (!latest) return

    const stored = storedRef.current
    if (!stored) {
      // First run — baseline this version, no update banner needed
      storedRef.current = latest
      localStorage.setItem(LS_KEY, latest)
      return
    }

    if (stored !== latest) {
      setUpdateAvailable(true)
    }
  }

  useEffect(() => {
    check()
    const id = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  function applyUpdate() {
    // Accept the new version and reload
    fetchVersion().then(v => {
      if (v) {
        storedRef.current = v
        localStorage.setItem(LS_KEY, v)
      }
    })
    window.location.reload()
  }

  function dismiss() {
    // Snooze until next build (update localStorage so we don't re-show
    // the banner until the version changes again)
    fetchVersion().then(v => {
      if (v) {
        storedRef.current = v
        localStorage.setItem(LS_KEY, v)
      }
    })
    setUpdateAvailable(false)
  }

  return { updateAvailable, applyUpdate, dismiss }
}
