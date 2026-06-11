import { STATUS_COLORS, STATUS_LABELS } from '../lib/status'

interface DashboardChromeProps {
  nodeCount: number
  plottedCount: number
  source: string | null
  lastUpdated: Date | null
  loading: boolean
  error: string | null
}

export function DashboardChrome({
  nodeCount,
  plottedCount,
  source,
  lastUpdated,
  loading,
  error,
}: DashboardChromeProps) {
  return (
    <>
      <div className="map-bar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">dibs</span>
          <span className="brand__sep">·</span>
          <span className="brand__view">Network view</span>
        </div>
        <span className="view-kick">
          Staging · <b>Nederland</b>
        </span>
      </div>

      <div className="metrics">
        <div className="met">
          <span className="met-k">Nodes</span>
          <span className="met-v">{nodeCount}</span>
        </div>
        <div className="met">
          <span className="met-k">Op kaart</span>
          <span className="met-v">{plottedCount}</span>
        </div>
        <div className="met">
          <span className="met-k">Bron</span>
          <span className="met-v met-v--sm">{source ?? '—'}</span>
        </div>
        <div className="met">
          <span className="met-k">Update</span>
          <span className="met-v met-v--sm">
            {lastUpdated ? lastUpdated.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
          </span>
        </div>
      </div>

      {(loading || error) && (
        <div className={`status-banner ${error ? 'status-banner--error' : ''}`}>
          {error ?? 'Laden…'}
        </div>
      )}

      <footer className="map-legend">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <span key={status} className="lg">
            <i style={{ background: STATUS_COLORS[status] }} />
            {label}
          </span>
        ))}
        <span className="lg lg--dim">3D tiles · binnenkort</span>
      </footer>
    </>
  )
}
