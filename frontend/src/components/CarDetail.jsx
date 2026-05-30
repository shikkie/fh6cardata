import { useEffect, useRef, useState } from 'react'
import TunePanel from './TunePanel.jsx'

const STAT_LABELS = [
  { key: 'speed',        label: 'Speed' },
  { key: 'handling',     label: 'Handling' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'launch',       label: 'Launch' },
  { key: 'braking',      label: 'Braking' },
  { key: 'offroad',      label: 'Off-Road' },
]

// Map availability keywords → icon + label
const AVAIL_TAGS = [
  { key: 'Autoshow',       icon: '🏪', label: 'Autoshow',       color: '#4caf50' },
  { key: 'Wheelspin',      icon: '🎰', label: 'Wheelspin',      color: '#2196f3' },
  { key: 'Barn Find',      icon: '🚗', label: 'Barn Find',      color: '#cc7722' },
  { key: 'Treasure Car',   icon: '💎', label: 'Treasure',       color: '#9c27b0' },
  { key: 'Horizon Promo',  icon: '⭐', label: 'Promo',          color: '#ff9800' },
  { key: 'Promo',          icon: '⭐', label: 'Promo',          color: '#ff9800' },
  { key: 'Car Pass',       icon: '🎟️', label: 'Car Pass',       color: '#e91e63' },
  { key: 'Car Mastery',    icon: '🏆', label: 'Car Mastery',    color: '#ff5722' },
  { key: 'Festival Playlist', icon: '📅', label: 'Playlist',   color: '#00bcd4' },
  { key: 'Hard-to-Find',   icon: '🔍', label: 'Hard-to-Find',  color: '#607d8b' },
  { key: 'VIP',            icon: '👑', label: 'VIP',            color: '#ffd700' },
  { key: 'World Time Attack', icon: '⏱️', label: 'Time Attack', color: '#795548' },
  { key: 'Series',         icon: '📆', label: 'Series',         color: '#009688' },
  { key: 'Pre-order',      icon: '📦', label: 'Pre-order',      color: '#9e9e9e' },
  { key: 'Legacy',         icon: '📜', label: 'Legacy',         color: '#8bc34a' },
  { key: 'Aftermarket',    icon: '🔧', label: 'Aftermarket',    color: '#607d8b' },
  { key: 'Plus',           icon: '➕', label: 'Plus',           color: '#3f51b5' },
  { key: 'Year-round',     icon: '📅', label: 'Year-round',     color: '#009688' },
]

function availTags(availability) {
  if (!availability) return []
  const seen = new Set()
  return AVAIL_TAGS.filter(t => {
    if (availability.includes(t.key) && !seen.has(t.label)) {
      seen.add(t.label)
      return true
    }
    return false
  })
}

function StatBar({ label, value }) {
  const pct = value != null ? Math.round((value / 10) * 100) : 0
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.78rem' }}>
        <span style={{ color: '#aaa' }}>{label}</span>
        <span style={{ color: '#f5f5f5', fontWeight: 600 }}>{value != null ? value.toFixed(1) : '—'}</span>
      </div>
      <div className="progress" style={{ height: '6px', backgroundColor: '#444' }}>
        <div
          className="progress-bar"
          style={{ width: `${pct}%`, backgroundColor: 'var(--fh6-accent)', transition: 'width 0.4s ease' }}
        />
      </div>
    </div>
  )
}

function formatCR(val) {
  if (!val) return '—'
  return val.toLocaleString('en-US') + ' CR'
}

function bidRange(car) {
  if (!car.auctionable || !car.base_value) return null
  const multipliers = {
    'Common':    [0.5, 1.2],
    'Rare':      [0.6, 1.4],
    'Epic':      [0.7, 1.6],
    'Legendary': [0.8, 2.0],
  }
  const [loMult, hiMult] = multipliers[car.rarity] || [0.6, 1.4]
  const lo = Math.round(car.base_value * loMult / 1000) * 1000
  const hi = Math.round(car.base_value * hiMult / 1000) * 1000
  return { lo, hi }
}

export default function CarDetail({ car, owned, onToggleOwned, wishlisted, onToggleWishlisted, onClose, onCarUpdate }) {
  const ref = useRef(null)
  const [activeTab, setActiveTab] = useState('info')
  const range = bidRange(car)
  const tags = availTags(car.availability)

  const [editingOrdinal, setEditingOrdinal] = useState(false)
  const [ordinalInput, setOrdinalInput] = useState('')
  const [ordinalSaving, setOrdinalSaving] = useState(false)
  const [ordinalError, setOrdinalError] = useState(null)

  // Last telemetry ordinal — used for Quick Assign
  const [lastOrdinal, setLastOrdinal] = useState(null)
  const [quickAssigning, setQuickAssigning] = useState(false)

  useEffect(() => {
    fetch('/api/telemetry/last-ordinal')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ordinal_id != null) setLastOrdinal(data) })
      .catch(() => {})
  }, [])

  function startEditOrdinal() {
    setOrdinalInput(car.carordinalid != null ? String(car.carordinalid) : '')
    setOrdinalError(null)
    setEditingOrdinal(true)
  }

  async function saveOrdinal() {
    const val = ordinalInput.trim()
    const parsed = val === '' ? null : parseInt(val, 10)
    if (val !== '' && (isNaN(parsed) || parsed < 0)) {
      setOrdinalError('Must be a positive integer')
      return
    }
    setOrdinalSaving(true)
    setOrdinalError(null)
    try {
      const resp = await fetch(`/api/cars/${car.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carordinalid: parsed }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setOrdinalError(data.error + (data.conflict_car ? ` (${data.conflict_car})` : ''))
        return
      }
      onCarUpdate?.(data)
      setEditingOrdinal(false)
    } catch {
      const isOffline = !navigator.onLine
      setOrdinalError(
        isOffline
          ? 'No network connection — check that the API is reachable and try again'
          : 'Could not reach the API server — it may need to be restarted (run ./run-dev.sh restart)'
      )
    } finally {
      setOrdinalSaving(false)
    }
  }

  async function quickAssignOrdinal() {
    if (!lastOrdinal?.ordinal_id) return
    setQuickAssigning(true)
    setOrdinalError(null)
    try {
      const resp = await fetch(`/api/cars/${car.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carordinalid: lastOrdinal.ordinal_id }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setOrdinalError(data.error + (data.conflict_car ? ` (${data.conflict_car})` : ''))
        return
      }
      onCarUpdate?.(data)
      // Ordinal is now taken — hide the Quick Assign button
      setLastOrdinal(prev => ({ ...prev, assigned_to_car_id: car.id, assigned_to_car_name: car.full_name }))
    } catch {
      setOrdinalError('Could not reach the API server')
    } finally {
      setQuickAssigning(false)
    }
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  async function copyValue(text) {
    try {
      await navigator.clipboard.writeText(text)
      const btn = ref.current?.querySelector('.copy-btn')
      if (btn) {
        btn.textContent = '✓ Copied!'
        setTimeout(() => { btn.textContent = 'Copy value' }, 1500)
      }
    } catch { /* clipboard not available */ }
  }

  return (
    <div
      className="car-detail-backdrop"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className="car-detail-sheet" ref={ref}>
        {/* Car image hero */}
        {car.image_url && (
          <img
            src={car.image_url}
            alt={car.full_name}
            className="car-detail-hero mb-3"
            referrerPolicy="no-referrer"
            loading="eager"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>{car.full_name}</div>
          </div>
          <button className="btn-close btn-close-white ms-2 flex-shrink-0" onClick={onClose} aria-label="Close" />
        </div>

        {/* Badges row */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          {car.pi_class && <span className={`class-badge class-${car.pi_class}`}>{car.pi_class}</span>}
          <span className={`rarity-badge rarity-${car.rarity.toLowerCase().replace(/ /g, '-')}`}>{car.rarity}</span>
          {car.pi && <span className="badge bg-secondary">PI {car.pi}</span>}
          {car.country && <span className="badge bg-secondary">{car.country}</span>}
        </div>

        {/* Tab bar */}
        <div className="d-flex gap-1 mb-3">
          {['info', 'tune'].map(tab => (
            <button
              key={tab}
              className="btn btn-sm"
              style={{
                fontSize: '0.78rem',
                padding: '3px 12px',
                borderRadius: '12px',
                backgroundColor: activeTab === tab ? 'var(--fh6-accent)' : 'transparent',
                color: activeTab === tab ? '#000' : '#aaa',
                border: `1px solid ${activeTab === tab ? 'var(--fh6-accent)' : '#444'}`,
                fontWeight: activeTab === tab ? 700 : 400,
              }}
              onClick={() => setActiveTab(tab)}
            >{tab === 'info' ? '📋 Info' : '🔧 Tune'}</button>
          ))}
        </div>

        {activeTab === 'info' && (<>
        {/* Availability tags */}
        {tags.length > 0 && (
          <div className="mb-3">
            <div className="detail-section-label">How to Get</div>
            <div className="d-flex flex-wrap gap-2 mt-1">
              {tags.map(t => (
                <span key={t.label} className="avail-tag" style={{ borderColor: t.color, color: t.color }}>
                  {t.icon} {t.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {car.stats && (
          <div className="mb-3">
            <div className="detail-section-label">Performance Stats</div>
            <div className="mt-2">
              {STAT_LABELS.map(({ key, label }) => (
                <StatBar key={key} label={label} value={car.stats[key]} />
              ))}
            </div>
          </div>
        )}

        {/* Ordinal ID */}
        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#111', border: '1px solid #333' }}>
          <div className="d-flex justify-content-between align-items-center">
            <span style={{ color: '#aaa', fontSize: '0.82rem' }}>Telemetry Ordinal ID</span>
            {!editingOrdinal && (
              <div className="d-flex align-items-center gap-2">
                <span style={{ color: '#f5f5f5', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {car.carordinalid != null ? `#${car.carordinalid}` : <span style={{ color: '#555' }}>not set</span>}
                </span>
                {/* Quick Assign button — only shown when a telemetry hit has been recorded */}
                {lastOrdinal?.ordinal_id != null && (() => {
                  // Ordinal is already identified to a car (any car) — 1:1 mapping is taken, hide.
                  if (lastOrdinal.assigned_to_car_id != null) return null
                  // Ordinal is free; show the button. Disable it when this car already has an ordinal
                  // to prevent an accidental overwrite — the user must use ✏️ to change it explicitly.
                  const thisCarHasOrdinal = car.carordinalid != null
                  return (
                    <button
                      className="btn btn-sm btn-outline-success"
                      style={{ fontSize: '0.72rem', padding: '1px 8px' }}
                      onClick={quickAssignOrdinal}
                      disabled={thisCarHasOrdinal || quickAssigning}
                      title={
                        thisCarHasOrdinal
                          ? `This car already has ordinal #${car.carordinalid} — use ✏️ to change it`
                          : `Quick assign last telemetry ordinal #${lastOrdinal.ordinal_id}`
                      }
                    >
                      {quickAssigning ? '…' : `⚡ #${lastOrdinal.ordinal_id}`}
                    </button>
                  )
                })()}
                <button
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: '0.72rem', padding: '1px 8px' }}
                  onClick={startEditOrdinal}
                  title="Set ordinal ID"
                >✏️</button>
              </div>
            )}
          </div>
          {editingOrdinal && (
            <div className="mt-2">
              <div className="d-flex gap-2 align-items-center">
                <input
                  type="number"
                  min="0"
                  className="form-control form-control-sm"
                  style={{ backgroundColor: '#1a1a1a', color: '#f5f5f5', border: '1px solid #555', width: '140px', fontFamily: 'monospace' }}
                  placeholder="e.g. 1234567"
                  value={ordinalInput}
                  onChange={e => setOrdinalInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveOrdinal(); if (e.key === 'Escape') setEditingOrdinal(false) }}
                  autoFocus
                />
                <button
                  className="btn btn-sm btn-outline-success"
                  style={{ fontSize: '0.72rem', padding: '2px 10px' }}
                  onClick={saveOrdinal}
                  disabled={ordinalSaving}
                >{ordinalSaving ? '…' : 'Save'}</button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                  onClick={() => setEditingOrdinal(false)}
                  disabled={ordinalSaving}
                >✕</button>
              </div>
              {ordinalError && (
                <div style={{ color: '#f44', fontSize: '0.75rem', marginTop: '4px' }}>{ordinalError}</div>
              )}
              <div style={{ color: '#666', fontSize: '0.72rem', marginTop: '4px' }}>
                Leave blank to clear. From the Forza Data Out UDP stream.
              </div>
            </div>
          )}
        </div>

        {/* Value & bid range */}
        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#111', border: '1px solid #333' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span style={{ color: '#aaa', fontSize: '0.82rem' }}>Base Value</span>
            <span style={{ color: 'var(--fh6-accent)', fontWeight: 700 }}>{formatCR(car.base_value)}</span>
          </div>
          {range && (
            <div className="d-flex justify-content-between align-items-center">
              <span style={{ color: '#aaa', fontSize: '0.82rem' }}>Est. Auction Range</span>
              <span style={{ color: '#f5f5f5', fontSize: '0.85rem' }}>{formatCR(range.lo)} – {formatCR(range.hi)}</span>
            </div>
          )}
          {!car.auctionable && (
            <div style={{ color: '#888', fontSize: '0.82rem' }}><i className="fas fa-ban me-1" />Not auctionable</div>
          )}
        </div>
        </>)}

        {activeTab === 'tune' && (
          <TunePanel piClass={car.pi_class} />
        )}

        {/* Actions */}
        <div className="d-flex gap-2 flex-wrap">
          <button
            className={`btn btn-sm ${owned ? 'btn-warning' : 'btn-outline-warning'}`}
            onClick={onToggleOwned}
          >
            {owned ? '🚗 In Garage' : '+ Add to Garage'}
          </button>
          {!owned && (
            <button
              className={`btn btn-sm ${wishlisted ? 'btn-info' : 'btn-outline-info'}`}
              onClick={onToggleWishlisted}
            >
              {wishlisted ? '⭐ Wishlisted' : '⭐ Add to Wishlist'}
            </button>
          )}
          {car.base_value && car.auctionable && (
            <button
              className="btn btn-sm btn-outline-light copy-btn"
              onClick={() => copyValue(car.base_value.toLocaleString('en-US') + ' CR')}
            >
              Copy value
            </button>
          )}
          <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
