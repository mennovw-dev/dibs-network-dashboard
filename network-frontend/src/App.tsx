import { useCallback, useEffect, useMemo, useState } from 'react'
import { CityOverview } from './components/CityOverview'
import { DashboardChrome } from './components/DashboardChrome'
import { ListingPanel } from './components/ListingPanel'
import { LocationReadout } from './components/LocationReadout'
import { NetworkMap } from './components/NetworkMap'
import { StatusTabs, matchesStatusFilter, type StatusFilter } from './components/StatusTabs'
import { StreetPanel, type StreetSelection } from './components/StreetPanel'
import { Timeline } from './components/Timeline'
import { type MapViewMode } from './components/MapViewToggle'
import { type TimeWindow } from './components/ViewSettings'
import { useNetworkNodes } from './hooks/useNetworkNodes'
import { useI18n } from './i18n'
import { enrichNode, type EnrichedNode } from './lib/houses'
import type { GeoLocation } from './lib/geocode'
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
  const [mapView, setMapView] = useState<MapViewMode>('3d')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('live')
  const [asOf, setAsOf] = useState<number>(() => Date.now())
  const [cursorLoc, setCursorLoc] = useState<GeoLocation | null>(null)
  const [street, setStreet] = useState<StreetSelection | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    writeCityToUrl(city?.id ?? null)
  }, [city])

  const handleSelectNode = useCallback((node: EnrichedNode | null) => {
    setSelectedId(node?.id ?? null)
  }, [])

  const handleTimeWindow = useCallback((next: TimeWindow) => {
    setTimeWindow(next)
    setAsOf(Date.now())
  }, [])

  const handleToggleTime = useCallback(() => {
    setTimeWindow((prev) => (prev === 'live' ? '30d' : 'live'))
    setAsOf(Date.now())
  }, [])

  const handleToggleMapView = useCallback(() => {
    setMapView((prev) => (prev === '3d' ? '2d' : '3d'))
  }, [])

  const enriched = useMemo<EnrichedNode[]>(() => nodes.map(enrichNode), [nodes])
  const visibleNodes = useMemo(
    () => enriched.filter((n) => matchesStatusFilter(n, statusFilter)),
    [enriched, statusFilter],
  )
  const plotted = enriched.filter((n) => n.has_coordinates).length
  const selectedNode = useMemo(
    () => enriched.find((n) => n.id === selectedId) ?? null,
    [enriched, selectedId],
  )

  // Live mode = no time filtering; over-time mode uses the scrubber's asOf.
  const effectiveAsOf = timeWindow === 'live' ? Number.MAX_SAFE_INTEGER : asOf

  return (
    <div className="app">
      <NetworkMap
        nodes={visibleNodes}
        selectedId={selectedId}
        onSelectNode={handleSelectNode}
        city={city}
        buildings3d={buildings3d}
        viewMode={mapView}
        asOf={effectiveAsOf}
        onCursorLocation={setCursorLoc}
        onStreetSelect={setStreet}
      />

      <div className="map-chrome">
        <DashboardChrome
          loading={loading}
          error={error}
          buildings3d={buildings3d}
          onToggle3d={setBuildings3d}
          mapView={mapView}
          onToggleMapView={handleToggleMapView}
          timeActive={timeWindow !== 'live'}
          onToggleTime={handleToggleTime}
          nodeCount={enriched.length}
          plottedCount={plotted}
          source={source}
          lastUpdated={lastUpdated}
          lang={lang}
        />

        <StatusTabs value={statusFilter} onChange={setStatusFilter} nodes={enriched} />

        <div className="left-rail">
          <CityOverview city={city} nodes={enriched} onSelect={setCity} />
          <StreetPanel
            selection={street}
            onClose={() => setStreet(null)}
            onPick={(node) => {
              setSelectedId(node.id)
              setStreet(null)
            }}
            lang={lang}
          />
        </div>

        <ListingPanel node={selectedNode} onClose={() => setSelectedId(null)} lang={lang} />
        <LocationReadout location={cursorLoc} active={cursorLoc != null} />

        {timeWindow !== 'live' && (
          <Timeline
            timeWindow={timeWindow}
            onTimeWindow={handleTimeWindow}
            asOf={asOf}
            onAsOf={setAsOf}
            lang={lang}
          />
        )}
      </div>
    </div>
  )
}

export default App
