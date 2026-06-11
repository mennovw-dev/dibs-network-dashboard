import { useEffect, useRef } from 'react'
import maplibregl, { type Map, type Marker } from 'maplibre-gl'
import type { City } from '../lib/cities'
import { NL_VIEW } from '../lib/cities'
import type { EnrichedNode } from '../lib/houses'
import { statusTag } from '../lib/status'
import { useT } from '../i18n'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const BUILDINGS_LAYER = 'dibs-3d-buildings'
const BUILDINGS_MIN_ZOOM = 13
const MAX_EXPANDED = 6

// Card footprint in screen px (must track the CSS card size for collision tests).
const CARD_W = 168
const CARD_H = 124
const CARD_H_SELECTED = 168
const CARD_PAD = 8

interface NetworkMapProps {
  nodes: EnrichedNode[]
  selectedId: string | null
  onSelectNode: (node: EnrichedNode | null) => void
  city: City | null
  buildings3d: boolean
}

interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

const STATUS_ORDER: Record<string, number> = { active: 0, paused: 1, closed: 2, draft: 3 }

function priorityScore(node: EnrichedNode): number {
  const statusRank = STATUS_ORDER[node.status] ?? 4
  const listedMs = node.listed_at ? new Date(node.listed_at).getTime() : 0
  // Lower is better: status first, then most recent listing.
  return statusRank * 1e13 - listedMs
}

// Selected card ranks first, hovered second, everything else keeps priority order.
function frontRank(node: EnrichedNode, selected: string | null, hovered: string | null): number {
  if (node.id === selected) {
    return -2
  }
  if (node.id === hovered) {
    return -1
  }
  return 0
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

function buildMarkerEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'house-marker'
  el.innerHTML = `
    <div class="house-marker__card">
      <div class="house-marker__photo"></div>
      <div class="house-marker__body">
        <span class="house-marker__name"></span>
        <span class="house-marker__wijk"></span>
      </div>
      <span class="house-marker__state"></span>
    </div>
    <span class="house-marker__pin"></span>
  `
  return el
}

export function NetworkMap({
  nodes,
  selectedId,
  onSelectNode,
  city,
  buildings3d,
}: NetworkMapProps) {
  const t = useT()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<globalThis.Map<string, { marker: Marker; el: HTMLDivElement }>>(
    new globalThis.Map(),
  )
  const hoveredRef = useRef<string | null>(null)

  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const buildings3dRef = useRef(buildings3d)
  buildings3dRef.current = buildings3d
  const onSelectRef = useRef(onSelectNode)
  onSelectRef.current = onSelectNode
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const tRef = useRef(t)
  tRef.current = t
  const declutterRaf = useRef<number | null>(null)

  // Decide which cards expand using SCREEN-SPACE collision detection so expanded
  // cards never overlap. Selected + hovered get priority; the rest fill up to
  // MAX_EXPANDED greedily by priority, skipping any that would collide.
  const syncMarkerStates = useRef<() => void>(() => {})
  syncMarkerStates.current = () => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const hovered = hoveredRef.current
    const selected = selectedRef.current

    const withCoords = nodesRef.current.filter(
      (n) => n.has_coordinates && n.longitude != null && n.latitude != null,
    )

    // Priority order, but force selected then hovered to the front.
    const ranked = [...withCoords].sort((a, b) => priorityScore(a) - priorityScore(b))
    ranked.sort((a, b) => frontRank(a, selected, hovered) - frontRank(b, selected, hovered))

    const placed: Rect[] = []
    const expandedIds = new Set<string>()

    for (const node of ranked) {
      if (expandedIds.size >= MAX_EXPANDED) {
        break
      }
      const p = map.project([node.longitude!, node.latitude!])
      const isSel = node.id === selected
      const h = isSel ? CARD_H_SELECTED : CARD_H
      const rect: Rect = {
        left: p.x - CARD_W / 2 - CARD_PAD,
        right: p.x + CARD_W / 2 + CARD_PAD,
        top: p.y - h - CARD_PAD,
        bottom: p.y + CARD_PAD,
      }
      if (!placed.some((r) => rectsOverlap(r, rect))) {
        expandedIds.add(node.id)
        placed.push(rect)
      }
    }

    for (const node of nodesRef.current) {
      const entry = markersRef.current.get(node.id)
      if (!entry) {
        continue
      }
      const isExpanded = expandedIds.has(node.id)
      const isSelected = node.id === selected
      const isHovered = node.id === hovered
      entry.el.classList.toggle('is-expanded', isExpanded)
      entry.el.classList.toggle('is-collapsed', !isExpanded)
      entry.el.classList.toggle('is-selected', isSelected)
      entry.el.dataset.status = node.status
      entry.el.style.zIndex = String(
        isSelected ? 50 : isHovered ? 40 : isExpanded ? 20 : 10,
      )
    }
  }

  const scheduleDeclutter = useRef<() => void>(() => {})
  scheduleDeclutter.current = () => {
    if (declutterRaf.current != null) {
      return
    }
    declutterRaf.current = requestAnimationFrame(() => {
      declutterRaf.current = null
      syncMarkerStates.current()
    })
  }

  // Init the map once.
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

    map.on('load', () => {
      addBuildingsLayer(map, buildings3dRef.current)
      syncMarkerStates.current()
    })

    // Re-run collision decluttering whenever the view changes.
    map.on('move', () => scheduleDeclutter.current())
    map.on('zoom', () => scheduleDeclutter.current())

    map.on('click', (e) => {
      // Clicking empty map clears selection.
      if (!(e.originalEvent.target as HTMLElement)?.closest('.house-marker')) {
        onSelectRef.current(null)
      }
    })

    mapRef.current = map
    return () => {
      if (declutterRaf.current != null) {
        cancelAnimationFrame(declutterRaf.current)
        declutterRaf.current = null
      }
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Create / update / remove markers when nodes change.
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const seen = new Set<string>()

    for (const node of nodes) {
      if (!node.has_coordinates || node.longitude == null || node.latitude == null) {
        continue
      }
      seen.add(node.id)
      let entry = markersRef.current.get(node.id)

      if (!entry) {
        const el = buildMarkerEl()
        el.dataset.id = node.id
        el.addEventListener('mouseenter', () => {
          hoveredRef.current = node.id
          el.classList.add('is-hovered')
          syncMarkerStates.current()
        })
        el.addEventListener('mouseleave', () => {
          if (hoveredRef.current === node.id) {
            hoveredRef.current = null
          }
          el.classList.remove('is-hovered')
          syncMarkerStates.current()
        })
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          const current = nodesRef.current.find((n) => n.id === node.id)
          onSelectRef.current(current ?? null)
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([node.longitude, node.latitude])
          .addTo(map)
        entry = { marker, el }
        markersRef.current.set(node.id, entry)
      } else {
        entry.marker.setLngLat([node.longitude, node.latitude])
      }

      // Update content.
      const photo = entry.el.querySelector<HTMLElement>('.house-marker__photo')
      if (photo && photo.dataset.src !== node.photo) {
        photo.dataset.src = node.photo
        photo.style.backgroundImage = `url("${node.photo}")`
      }
      entry.el.querySelector('.house-marker__name')!.textContent =
        node.name || node.city || '—'
      entry.el.querySelector('.house-marker__wijk')!.textContent =
        node.neighborhood ?? node.city ?? ''
      entry.el.querySelector('.house-marker__state')!.textContent = statusTag(node, tRef.current)
    }

    // Remove stale markers.
    for (const [id, entry] of markersRef.current) {
      if (!seen.has(id)) {
        entry.marker.remove()
        markersRef.current.delete(id)
      }
    }

    syncMarkerStates.current()
  }, [nodes])

  // Re-sync visual states when selection changes.
  useEffect(() => {
    syncMarkerStates.current()
  }, [selectedId, nodes])

  // City change → smooth fly.
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

  // Click-to-zoom on selected node.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) {
      return
    }
    const node = nodesRef.current.find((n) => n.id === selectedId)
    if (node?.longitude != null && node?.latitude != null) {
      map.flyTo({
        center: [node.longitude, node.latitude],
        zoom: Math.max(map.getZoom(), 15.5),
        pitch: Math.max(map.getPitch(), 50),
        duration: 1200,
        essential: true,
      })
    }
  }, [selectedId])

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
