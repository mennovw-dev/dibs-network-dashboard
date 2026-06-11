import { useT } from '../i18n'

export type MapViewMode = '2d' | '3d'

interface MapViewToggleProps {
  mode: MapViewMode
  onToggle: () => void
}

export function MapViewToggle({ mode, onToggle }: MapViewToggleProps) {
  const t = useT()
  const is3d = mode === '3d'
  const label = is3d ? t('view.map2d') : t('view.map3d')

  return (
    <button
      type="button"
      className={`icon-btn map-view-toggle ${is3d ? 'is-3d' : 'is-2d'}`}
      onClick={onToggle}
      aria-pressed={is3d}
      title={label}
      aria-label={label}
    >
      {is3d ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 18l8-4.5L20 18M4 14l8-4.5L20 14M4 10l8-4.5L20 10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 7.5h14v9H5zM8.5 5.5h7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9 11h6M9 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
