export default function Navbar({ onRefreshData }) {
  return (
    <nav className="navbar navbar-fh6 navbar-dark sticky-top px-3">
      <span className="navbar-brand mb-0">
        <i className="fas fa-car me-2" />
        FH6 Auction House
      </span>
      <span className="text-muted small d-none d-sm-inline">Car Data Browser</span>
      {onRefreshData && (
        <button
          className="btn btn-sm btn-outline-secondary ms-auto"
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
