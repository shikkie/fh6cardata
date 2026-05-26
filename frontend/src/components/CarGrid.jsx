import { useState } from 'react'
import CarCard from './CarCard.jsx'
import CarDetail from './CarDetail.jsx'

export default function CarGrid({ cars, loading, error, isOwned, toggleOwned }) {
  const [selected, setSelected] = useState(null)

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border spinner-fh6 border-secondary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-triangle me-2" />
        Failed to load car data: {error}
      </div>
    )
  }

  if (!cars.length) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="fas fa-car-crash fa-2x mb-3 d-block" />
        No cars match your filters.
      </div>
    )
  }

  return (
    <>
      <p className="result-count mb-2">
        <i className="fas fa-list me-1" />
        {cars.length} car{cars.length !== 1 ? 's' : ''}
      </p>
      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-2">
        {cars.map(car => (
          <div className="col" key={car.id}>
            <CarCard
              car={car}
              owned={isOwned(car.id)}
              onClick={() => setSelected(car)}
            />
          </div>
        ))}
      </div>

      {selected && (
        <CarDetail
          car={selected}
          owned={isOwned(selected.id)}
          onToggleOwned={() => toggleOwned(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
