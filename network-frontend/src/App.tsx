import { NetworkMap } from './components/NetworkMap'
import { useNetworkNodes } from './hooks/useNetworkNodes'
import { statusColor } from './lib/nodesGeoJSON'
import './App.css'

function App() {
  const { nodes, loading, error, source, lastUpdated } = useNetworkNodes()
  const plotted = nodes.filter((n) => n.has_coordinates).length

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Dibs Network Dashboard</p>
          <h1>Staging listings</h1>
        </div>
        <div className="stats">
          <div>
            <span className="label">Nodes</span>
            <strong>{nodes.length}</strong>
          </div>
          <div>
            <span className="label">Op kaart</span>
            <strong>{plotted}</strong>
          </div>
          <div>
            <span className="label">Bron</span>
            <strong>{source ?? '—'}</strong>
          </div>
          <div>
            <span className="label">Update</span>
            <strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</strong>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading && <div className="banner">Laden…</div>}
        {error && <div className="banner error">{error}</div>}
        <NetworkMap nodes={nodes} />
      </main>

      <footer className="legend">
        {(['active', 'paused', 'closed', 'draft'] as const).map((status) => (
          <span key={status} className="legend-item">
            <i style={{ background: statusColor(status) }} />
            {status}
          </span>
        ))}
      </footer>
    </div>
  )
}

export default App
