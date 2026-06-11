import { useMemo, useState } from 'react'
import { DashboardChrome } from './components/DashboardChrome'
import { ListingPanel } from './components/ListingPanel'
import { NetworkMap } from './components/NetworkMap'
import { useNetworkNodes } from './hooks/useNetworkNodes'
import './App.css'

function App() {
  const { nodes, loading, error, source, lastUpdated } = useNetworkNodes()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const plotted = nodes.filter((n) => n.has_coordinates).length
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  return (
    <div className="app">
      <NetworkMap
        nodes={nodes}
        selectedId={selectedId}
        onSelectNode={(node) => setSelectedId(node?.id ?? null)}
      />

      <div className="map-chrome">
        <DashboardChrome
          nodeCount={nodes.length}
          plottedCount={plotted}
          source={source}
          lastUpdated={lastUpdated}
          loading={loading}
          error={error}
        />
        <ListingPanel node={selectedNode} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  )
}

export default App
