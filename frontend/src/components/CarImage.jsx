import { useState, useEffect } from 'react'

const CAR_PLACEHOLDER = (
  <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="200" height="100" fill="#1a1a1a" />
    {/* Car body */}
    <path
      d="M20 65 L30 45 Q50 30 80 28 L120 28 Q150 30 170 45 L180 65 L185 68 L185 75 L15 75 L15 68 Z"
      fill="#2a2a2a"
      stroke="#3a3a3a"
      strokeWidth="1"
    />
    {/* Windshield */}
    <path d="M82 30 L78 48 L122 48 L118 30 Z" fill="#1e2a3a" stroke="#2a3a4a" strokeWidth="0.5" />
    {/* Rear window */}
    <path d="M36 48 L42 32 L78 30 L82 48 Z" fill="#1e2a3a" stroke="#2a3a4a" strokeWidth="0.5" />
    <path d="M118 30 L122 48 L158 48 L164 32 Z" fill="#1e2a3a" stroke="#2a3a4a" strokeWidth="0.5" />
    {/* Wheels */}
    <circle cx="55" cy="75" r="14" fill="#111" stroke="#444" strokeWidth="2" />
    <circle cx="55" cy="75" r="8" fill="#222" stroke="#555" strokeWidth="1" />
    <circle cx="145" cy="75" r="14" fill="#111" stroke="#444" strokeWidth="2" />
    <circle cx="145" cy="75" r="8" fill="#222" stroke="#555" strokeWidth="1" />
    {/* Headlights */}
    <ellipse cx="178" cy="57" rx="5" ry="3" fill="#444" stroke="#555" strokeWidth="0.5" />
    <ellipse cx="22" cy="57" rx="5" ry="3" fill="#444" stroke="#555" strokeWidth="0.5" />
  </svg>
)

/**
 * Displays a car image with a styled SVG placeholder fallback.
 *
 * @param {string|null} src  - image URL from car data
 * @param {string}      alt  - accessible alt text
 * @param {string}      [className] - extra class names for the container
 */
export default function CarImage({ src, alt, className = '', lazy = true }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => { setFailed(false) }, [src])

  const showPlaceholder = !src || failed

  return (
    <div className={`car-image-wrap ${className}`}>
      {showPlaceholder ? (
        <div className="car-image-placeholder" aria-label={alt}>
          {CAR_PLACEHOLDER}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="car-image"
          onError={() => setFailed(true)}
          loading={lazy ? 'lazy' : 'eager'}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  )
}
