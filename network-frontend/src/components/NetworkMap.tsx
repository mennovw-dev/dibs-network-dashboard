import { useEffect, useRef } from 'react'
import maplibregl, { type Map } from 'maplibre-gl'
import type { ListingNode } from '../types'
import { nodesToGeoJSON } from '../lib/nodesGeoJSON'
import { MAP_STATUS_COLORS } from '../lib/status'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const SOURCE_ID = 'listing-nodes'

interface NetworkMapProps {
  nodes: ListingNode[]
  selectedId: string | null
  onSelectNode: (node: ListingNode | null) => void
}

export function NetworkMap({ nodes, selectedId, onSelectNode }: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [5.2913, 52.1326],
      zoom: 7,
      attributionControl: false,
    })

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    )
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: nodesToGeoJSON([]),
      })

      map.addLayer({
        id: 'listing-nodes-halo',
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'id'], selectedId ?? ''],
            14,
            ['match', ['get', 'status'], 'paused', 11, 'active', 9, 0],
          ],
          'circle-color': [
            'match',
            ['get', 'status'],
            'active',
            MAP_STATUS_COLORS.active,
            'paused',
            MAP_STATUS_COLORS.paused,
            'transparent',
          ],
          'circle-opacity': 0.28,
        },
      })

      map.addLayer({
        id: 'listing-nodes',
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'id'], selectedId ?? ''],
            8,
            6,
          ],
          'circle-color': [
            'match',
            ['get', 'status'],
            'active',
            MAP_STATUS_COLORS.active,
            'paused',
            MAP_STATUS_COLORS.paused,
            'closed',
            MAP_STATUS_COLORS.closed,
            'draft',
            MAP_STATUS_COLORS.draft,
            MAP_STATUS_COLORS.active,
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'id'], selectedId ?? ''],
            2,
            1,
          ],
          'circle-stroke-color': '#100d0a',
        },
      })

      const pickNode = (featureId: string | number | undefined) => {
        if (featureId == null) {
          onSelectNode(null)
          return
        }
        const node = nodesRef.current.find((n) => n.id === String(featureId))
        onSelectNode(node ?? null)
      }

      map.on('click', 'listing-nodes', (event) => {
        const feature = event.features?.[0]
        pickNode(feature?.properties?.id)
      })

      map.on('mouseenter', 'listing-nodes', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'listing-nodes', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [onSelectNode])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) {
      return
    }

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    source?.setData(nodesToGeoJSON(nodes))
  }, [nodes])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) {
      return
    }
    if (map.getLayer('listing-nodes-halo')) {
      map.setPaintProperty('listing-nodes-halo', 'circle-radius', [
        'case',
        ['==', ['get', 'id'], selectedId ?? ''],
        14,
        ['match', ['get', 'status'], 'paused', 11, 'active', 9, 0],
      ])
    }
    if (map.getLayer('listing-nodes')) {
      map.setPaintProperty('listing-nodes', 'circle-radius', [
        'case',
        ['==', ['get', 'id'], selectedId ?? ''],
        8,
        6,
      ])
      map.setPaintProperty('listing-nodes', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'id'], selectedId ?? ''],
        2,
        1,
      ])
    }
  }, [selectedId])

  return (
    <div className="network-map-wrap">
      <div ref={containerRef} className="network-map" />
      <div className="map-vignette" aria-hidden="true" />
    </div>
  )
}
