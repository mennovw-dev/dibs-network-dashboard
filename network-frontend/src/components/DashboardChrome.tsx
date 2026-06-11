import { STATUS_COLORS, STATUS_LABEL_KEYS } from '../lib/status'
import { useT } from '../i18n'
import { LangToggle } from './LangToggle'
import { ViewSettings, type TimeWindow } from './ViewSettings'

interface DashboardChromeProps {
  loading: boolean
  error: string | null
  buildings3d: boolean
  onToggle3d: (value: boolean) => void
  timeWindow: TimeWindow
  onTimeWindow: (value: TimeWindow) => void
}

export function DashboardChrome({
  loading,
  error,
  buildings3d,
  onToggle3d,
  timeWindow,
  onTimeWindow,
}: DashboardChromeProps) {
  const t = useT()

  return (
    <>
      <div className="map-bar">
        <div className="map-bar__left">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__name">dibs</span>
            <span className="brand__sep">·</span>
            <span className="brand__view">{t('brand.view')}</span>
          </div>
        </div>
        <div className="map-bar__right">
          <span className="view-kick">{t('topbar.staging')}</span>
          <LangToggle />
        </div>
      </div>

      <ViewSettings
        buildings3d={buildings3d}
        onToggle3d={onToggle3d}
        timeWindow={timeWindow}
        onTimeWindow={onTimeWindow}
      />

      {(loading || error) && (
        <div className={`status-banner ${error ? 'status-banner--error' : ''}`}>
          {error ?? t('status.loading')}
        </div>
      )}

      <footer className="map-legend">
        {Object.entries(STATUS_LABEL_KEYS).map(([status, key]) => (
          <span key={status} className="lg">
            <i style={{ background: STATUS_COLORS[status] }} />
            {t(key)}
          </span>
        ))}
        <span className="lg lg--dim">{t('legend.3d')}</span>
      </footer>
    </>
  )
}
