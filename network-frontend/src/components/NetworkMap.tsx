import { useEffect, useRef } from 'react'
import maplibregl, { type Map, type Popup } from 'maplibre-gl'
import type { ListingNode } from '../types'
import { nodesToGeoJSON } from '../lib/nodesGeoJSON'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const SOURCE_ID = 'listing-nodes'

interface NetworkMapProps {
  nodes: ListingNode[]
}

export function NetworkMap({ nodes }: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const popupRef = useRef<Popup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [5.2913, 52.1326],
      zoom: 7,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
    })

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
            'match',
            ['get', 'status'],
            'paused',
            11,
            'closed',
            11,
            0,
          ],
          'circle-color': [
            'match',
            ['get', 'status'],
            'paused',
            '#eab308',
            'closed',
            '#ef4444',
            'transparent',
          ],
          'circle-opacity': 0.35,
        },
      })

      map.addLayer({
        id: 'listing-nodes',
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': 7,
          'circle-color': [
            'match',
            ['get', 'status'],
            'active',
            '#22c55e',
            'paused',
            '#ca8a04',
            'closed',
            '#ef4444',
            'draft',
            '#94a3b8',
            '#38bdf8',
          ],
          'circle-stroke-width': [
            'match',
            ['get', 'status'],
            'paused',
            2,
            'closed',
            2,
            1,
          ],
          'circle-stroke-color': '#0f172a',
        },
      })

      map.on('mouseenter', 'listing-nodes', (event) => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') {
          return
        }

        const props = feature.properties as Record<string, string | number>
        popupRef.current
          ?.setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(
            `<strong>${props.name}</strong><br/>${props.city}<br/>Status: ${props.status}<br/>Reacties: ${props.reactions_count}/${props.reactions_max}`,
          )
          .addTo(map)
      })

      map.on('mouseleave', 'listing-nodes', () => {
        map.getCanvas().style.cursor = ''
        popupRef.current?.remove()
      })
    })

    mapRef.current = map

    return () => {
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) {
      return
    }

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    source?.setData(nodesToGeoJSON(nodes))
  }, [nodes])

  return <div ref={containerRef} className="network-map" />
}
