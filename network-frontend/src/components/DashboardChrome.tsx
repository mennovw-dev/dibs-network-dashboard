import { STATUS_COLORS, STATUS_LABEL_KEYS } from '../lib/status'
import { useT } from '../i18n'
import { SettingsMenu } from './SettingsMenu'
import { TimeToggle } from './TimeToggle'

interface DashboardChromeProps {
  loading: boolean
  error: string | null
  buildings3d: boolean
  onToggle3d: (value: boolean) => void
  timeActive: boolean
  onToggleTime: () => void
  nodeCount: number
  plottedCount: number
  source: string | null
  lastUpdated: Date | null
  lang: string
}

export function DashboardChrome({
  loading,
  error,
  buildings3d,
  onToggle3d,
  timeActive,
  onToggleTime,
  nodeCount,
  plottedCount,
  source,
  lastUpdated,
  lang,
}: DashboardChromeProps) {
  const t = useT()

  return (
    <>
      <div className="map-bar">
        <div className="map-bar__left">
          <div className="brand">
            <img className="brand__mark" src="/dibs-mark-white.png" alt="Dibs" />
            <span className="brand__name">dibs</span>
            <span className="brand__sep">·</span>
            <span className="brand__view">{t('brand.view')}</span>
          </div>
        </div>
        <div className="map-bar__right">
          <TimeToggle active={timeActive} onToggle={onToggleTime} />
          <SettingsMenu
            buildings3d={buildings3d}
            onToggle3d={onToggle3d}
            nodeCount={nodeCount}
            plottedCount={plottedCount}
            source={source}
            lastUpdated={lastUpdated}
            lang={lang}
          />
        </div>
      </div>

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
