import { useCallback, useEffect, useMemo, useState } from 'react'
import { CityOverview } from './components/CityOverview'
import { DashboardChrome } from './components/DashboardChrome'
import { ListingPanel } from './components/ListingPanel'
import { LocationReadout } from './components/LocationReadout'
import { Metrics } from './components/Metrics'
import { NetworkMap } from './components/NetworkMap'
import { useNetworkNodes } from './hooks/useNetworkNodes'
import { useI18n } from './i18n'
import { enrichNode, type EnrichedNode } from './lib/houses'
import {
  cityFromUrl,
  getCity,
  writeCityToUrl,
  DEFAULT_CITY_ID,
  type City,
} from './lib/cities'
import './App.css'

function App() {
  const { lang } = useI18n()
  const { nodes, loading, error, source, lastUpdated } = useNetworkNodes()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [city, setCity] = useState<City | null>(
    () => cityFromUrl() ?? getCity(DEFAULT_CITY_ID),
  )
  const [buildings3d, setBuildings3d] = useState(true)

  useEffect(() => {
    writeCityToUrl(city?.id ?? null)
  }, [city])

  const handleSelectNode = useCallback((node: EnrichedNode | null) => {
    setSelectedId(node?.id ?? null)
  }, [])

  const enriched = useMemo<EnrichedNode[]>(() => nodes.map(enrichNode), [nodes])
  const plotted = enriched.filter((n) => n.has_coordinates).length
  const selectedNode = useMemo(
    () => enriched.find((n) => n.id === selectedId) ?? null,
    [enriched, selectedId],
  )

  return (
    <div className="app">
      <NetworkMap
        nodes={enriched}
        selectedId={selectedId}
        onSelectNode={handleSelectNode}
        city={city}
        buildings3d={buildings3d}
      />

      <div className="map-chrome">
        <DashboardChrome
          loading={loading}
          error={error}
          buildings3d={buildings3d}
          onToggle3d={setBuildings3d}
        />

        <div className="left-rail">
          <CityOverview city={city} nodes={enriched} onSelect={setCity} />
          <Metrics
            nodeCount={enriched.length}
            plottedCount={plotted}
            source={source}
            lastUpdated={lastUpdated}
            lang={lang}
          />
        </div>

        <ListingPanel node={selectedNode} onClose={() => setSelectedId(null)} />
        <LocationReadout node={selectedNode} />
      </div>
    </div>
  )
}

export default App
