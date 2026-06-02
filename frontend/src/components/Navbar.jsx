function formatPercent(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '5'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

export default function Navbar({ onRefreshData, onOpenSettings, discountSettings }) {
  const discountEnabled = Boolean(discountSettings?.enabled)

  return (
    <nav className="navbar navbar-fh6 navbar-dark sticky-top px-3">
      <span className="navbar-brand mb-0">
        <i className="fas fa-car me-2" />
        FH6 Auction House
      </span>
      <span className="text-muted small d-none d-sm-inline">
        Car Data Browser
        {discountEnabled && (
          <span className="discount-status-chip ms-2">Autoshow -{formatPercent(discountSettings?.percent)}%</span>
        )}
      </span>
      {onOpenSettings && (
        <button
          className="btn btn-sm btn-outline-secondary ms-auto me-2"
          onClick={onOpenSettings}
          title="Open pricing settings"
          aria-label="Open pricing settings"
        >
          <i className="fa-solid fa-gear" />
        </button>
      )}
      {onRefreshData && (
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={onRefreshData}
          title="Refresh data from server"
          aria-label="Refresh car data"
        >
          <i className="fa-solid fa-rotate" />
        </button>
      )}
    </nav>
  )
}
