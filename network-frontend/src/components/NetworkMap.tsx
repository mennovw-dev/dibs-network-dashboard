import { useEffect, useRef } from 'react'
import maplibregl, { type Map } from 'maplibre-gl'
import type { ListingNode } from '../types'
import type { City } from '../lib/cities'
import { NL_VIEW } from '../lib/cities'
import { nodesToGeoJSON } from '../lib/nodesGeoJSON'
import { MAP_STATUS_COLORS } from '../lib/status'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const SOURCE_ID = 'listing-nodes'
const BUILDINGS_LAYER = 'dibs-3d-buildings'
const BUILDINGS_MIN_ZOOM = 13

interface NetworkMapProps {
  nodes: ListingNode[]
  selectedId: string | null
  onSelectNode: (node: ListingNode | null) => void
  city: City | null
  buildings3d: boolean
}

function haloRadiusExpr(
  selectedId: string | null,
  pulse = 0,
): maplibregl.ExpressionSpecification {
  const base = 13 + pulse * 6
  const sel = 18 + pulse * 8
  return ['case', ['==', ['get', 'id'], selectedId ?? ''], sel, base]
}

function addBuildingsLayer(map: Map, visible: boolean) {
  if (map.getLayer(BUILDINGS_LAYER)) {
    return
  }
  const style = map.getStyle()
  const vectorSourceId = Object.entries(style.sources ?? {}).find(
    ([, src]) => (src as { type?: string }).type === 'vector',
  )?.[0]
  if (!vectorSourceId) {
    return
  }

  map.addLayer({
    id: BUILDINGS_LAYER,
    type: 'fill-extrusion',
    source: vectorSourceId,
    'source-layer': 'building',
    minzoom: BUILDINGS_MIN_ZOOM,
    layout: { visibility: visible ? 'visible' : 'none' },
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'render_height'], 0],
        0,
        '#15121f',
        40,
        '#251c3d',
        120,
        '#3a2a63',
      ],
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        BUILDINGS_MIN_ZOOM,
        0,
        BUILDINGS_MIN_ZOOM + 1,
        ['coalesce', ['get', 'render_height'], 0],
      ],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0.82,
    },
  })
}

export function NetworkMap({
  nodes,
  selectedId,
  onSelectNode,
  city,
  buildings3d,
}: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const buildings3dRef = useRef(buildings3d)
  buildings3dRef.current = buildings3d
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const onSelectRef = useRef(onSelectNode)
  onSelectRef.current = onSelectNode

  // Init the map exactly once. Camera + handlers never tear down on data updates.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const initial = city ?? { ...NL_VIEW, id: '', name: '' }
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: initial.center,
      zoom: initial.zoom,
      pitch: initial.pitch,
      bearing: initial.bearing,
      attributionControl: false,
    })

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 16,
      className: 'node-popup',
    })
    popupRef.current = popup

    map.on('load', () => {
      addBuildingsLayer(map, buildings3dRef.current)

      map.addSource(SOURCE_ID, { type: 'geojson', data: nodesToGeoJSON([]) })

      // Soft outer glow
      map.addLayer({
        id: 'listing-nodes-halo',
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': haloRadiusExpr(selectedRef.current),
          'circle-color': [
            'match',
            ['get', 'status'],
            'active',
            MAP_STATUS_COLORS.active,
            'paused',
            MAP_STATUS_COLORS.paused,
            'closed',
            MAP_STATUS_COLORS.closed,
            MAP_STATUS_COLORS.draft,
          ],
          'circle-opacity': 0.22,
          'circle-blur': 0.6,
        },
      })

      // Core dot
      map.addLayer({
        id: 'listing-nodes',
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['==', ['get', 'id'], selectedRef.current ?? ''], 8, 6],
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
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.85,
        },
      })

      // Invisible wide hit target so clicking/hovering is forgiving
      map.addLayer({
        id: 'listing-nodes-hit',
        type: 'circle',
        source: SOURCE_ID,
        paint: { 'circle-radius': 16, 'circle-color': '#000', 'circle-opacity': 0 },
      })

      const pickNode = (featureId: string | number | undefined) => {
        if (featureId == null) {
          onSelectRef.current(null)
          return
        }
        const node = nodesRef.current.find((n) => n.id === String(featureId))
        onSelectRef.current(node ?? null)
      }

      map.on('click', 'listing-nodes-hit', (event) => {
        pickNode(event.features?.[0]?.properties?.id)
      })

      map.on('mouseenter', 'listing-nodes-hit', (event) => {
        map.getCanvas().style.cursor = 'pointer'
        const f = event.features?.[0]
        const node = nodesRef.current.find((n) => n.id === String(f?.properties?.id))
        if (node && node.longitude != null && node.latitude != null) {
          popup
            .setLngLat([node.longitude, node.latitude])
            .setHTML(
              `<span class="node-popup__name">${escapeHtml(node.name || node.city || '—')}</span>` +
                `<span class="node-popup__sub">${escapeHtml(node.city || '')}</span>`,
            )
            .addTo(map)
        }
      })

      map.on('mouseleave', 'listing-nodes-hit', () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })

      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
      source?.setData(nodesToGeoJSON(nodesRef.current))

      // Gentle pulse animation on the halo (cheap; few nodes).
      let t = 0
      const tick = () => {
        if (!mapRef.current) {
          return
        }
        t += 0.035
        const pulse = (Math.sin(t) + 1) / 2
        if (map.getLayer('listing-nodes-halo')) {
          map.setPaintProperty(
            'listing-nodes-halo',
            'circle-radius',
            haloRadiusExpr(selectedRef.current, pulse),
          )
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    mapRef.current = map

    return () => {
      popup.remove()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Subtle data updates — only the GeoJSON source data changes, never the camera.
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const apply = () => {
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
      source?.setData(nodesToGeoJSON(nodes))
    }
    if (map.isStyleLoaded() && map.getSource(SOURCE_ID)) {
      apply()
    } else {
      map.once('idle', apply)
    }
  }, [nodes])

  // Selection highlight (core dot only; halo handled by pulse loop).
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded() || !map.getLayer('listing-nodes')) {
      return
    }
    map.setPaintProperty('listing-nodes', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], selectedId ?? ''],
      9,
      6,
    ])
  }, [selectedId])

  // City change → smooth fly, no rebuild.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !city) {
      return
    }
    map.flyTo({
      center: city.center,
      zoom: city.zoom,
      pitch: city.pitch,
      bearing: city.bearing,
      duration: 1600,
      essential: true,
    })
  }, [city])

  // 3D toggle.
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const apply = () => {
      if (!map.getLayer(BUILDINGS_LAYER)) {
        addBuildingsLayer(map, buildings3d)
      }
      if (map.getLayer(BUILDINGS_LAYER)) {
        map.setLayoutProperty(BUILDINGS_LAYER, 'visibility', buildings3d ? 'visible' : 'none')
      }
    }
    if (map.isStyleLoaded()) {
      apply()
    } else {
      map.once('load', apply)
    }
  }, [buildings3d])

  return (
    <div className="network-map-wrap">
      <div ref={containerRef} className="network-map" />
      <div className="map-vignette" aria-hidden="true" />
    </div>
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
