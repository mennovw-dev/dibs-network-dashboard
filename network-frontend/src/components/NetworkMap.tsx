import { useEffect, useRef } from 'react'
import maplibregl, { type Map, type Marker } from 'maplibre-gl'
import type { City } from '../lib/cities'
import { NL_VIEW } from '../lib/cities'
import type { EnrichedNode } from '../lib/houses'
import { getAnalytics } from '../lib/analytics'
import { statusTag } from '../lib/status'
import { reverseGeocode, streetMatches, type GeoLocation } from '../lib/geocode'
import type { StreetSelection } from './StreetPanel'
import type { MapViewMode } from './MapViewToggle'
import { useT, type TFn } from '../i18n'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const BUILDINGS_LAYER = 'dibs-3d-buildings'
const BUILDINGS_MIN_ZOOM = 13

// Z-index bands inside the map layer (chrome sits above the whole map wrap).
const Z_DEPTH_BASE = 10
const Z_HOVER_BOOST = 5000
const Z_SELECT_BOOST = 6000

// Screen-space card footprint (keep in sync with CSS).
const CARD_W = 176
const CARD_H = 148
const CARD_H_RICH = 208
const PIN_H = 11
const PIN_GAP = 3
/** Allow gentle overlap — not a rigid grid, but stay usable. */
const MAX_OVERLAP = 0.34

interface ScreenRect {
  left: number
  right: number
  top: number
  bottom: number
}

interface Offset {
  ox: number
  oy: number
}

function overlapRatio(a: ScreenRect, b: ScreenRect): number {
  const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  const hit = ox * oy
  if (hit <= 0) {
    return 0
  }
  const areaA = (a.right - a.left) * (a.bottom - a.top)
  const areaB = (b.right - b.left) * (b.bottom - b.top)
  return hit / Math.min(areaA, areaB)
}

function cardScreenRect(px: number, py: number, ox: number, oy: number, h: number): ScreenRect {
  const bottom = py - PIN_H - PIN_GAP + oy
  const cx = px + ox
  const half = CARD_W / 2
  return { left: cx - half, right: cx + half, top: bottom - h, bottom }
}

/** Organic offsets — prefer up / fan out, not a blocky grid. */
function* offsetCandidates(): Generator<Offset> {
  yield { ox: 0, oy: 0 }
  for (let ring = 1; ring <= 6; ring++) {
    const d = ring * 24
    yield { ox: 0, oy: -d }
    yield { ox: d * 0.7, oy: -d * 0.55 }
    yield { ox: -d * 0.7, oy: -d * 0.55 }
    yield { ox: d, oy: -d * 0.15 }
    yield { ox: -d, oy: -d * 0.15 }
    yield { ox: d * 0.45, oy: d * 0.4 }
    yield { ox: -d * 0.45, oy: d * 0.4 }
    yield { ox: 0, oy: d * 0.25 }
  }
}

function pickOffset(px: number, py: number, h: number, placed: ScreenRect[]): Offset {
  let best: Offset = { ox: 0, oy: 0 }
  let bestScore = Infinity

  for (const c of offsetCandidates()) {
    const rect = cardScreenRect(px, py, c.ox, c.oy, h)
    let peak = 0
    for (const p of placed) {
      peak = Math.max(peak, overlapRatio(rect, p))
    }
    const dist = Math.hypot(c.ox, c.oy)
    const score = peak * 900 + dist * 0.12
    if (peak <= MAX_OVERLAP && score < bestScore) {
      bestScore = score
      best = c
    }
  }

  if (bestScore === Infinity) {
    for (const c of offsetCandidates()) {
      const rect = cardScreenRect(px, py, c.ox, c.oy, h)
      let peak = 0
      for (const p of placed) {
        peak = Math.max(peak, overlapRatio(rect, p))
      }
      const score = peak * 400 + Math.hypot(c.ox, c.oy) * 0.15
      if (score < bestScore) {
        bestScore = score
        best = c
      }
    }
  }

  return best
}

function updateLeaderLine(el: HTMLDivElement, ox: number, oy: number, cardH: number) {
  const svg = el.querySelector<SVGSVGElement>('.house-marker__leader')
  const line = el.querySelector<SVGLineElement>('.house-marker__leader line')
  if (!svg || !line) {
    return
  }

  const w = CARD_W
  const totalH = cardH + PIN_H + PIN_GAP + 6
  svg.setAttribute('width', String(w))
  svg.setAttribute('height', String(totalH))

  const pinX = w / 2
  const pinY = cardH + PIN_GAP + PIN_H / 2
  const cardX = w / 2 + ox
  const cardY = cardH + oy
  const dist = Math.hypot(cardX - pinX, cardY - pinY)

  const show = dist > 8
  el.classList.toggle('is-offset', show)
  if (!show) {
    return
  }

  line.setAttribute('x1', String(pinX))
  line.setAttribute('y1', String(pinY))
  line.setAttribute('x2', String(cardX))
  line.setAttribute('y2', String(cardY))
}

interface NetworkMapProps {
  nodes: EnrichedNode[]
  selectedId: string | null
  onSelectNode: (node: EnrichedNode | null) => void
  city: City | null
  buildings3d: boolean
  viewMode: MapViewMode
  asOf: number
  onCursorLocation: (loc: GeoLocation | null) => void
  onStreetSelect: (selection: StreetSelection | null) => void
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
        '#101816',
        40,
        '#18302d',
        120,
        '#274d49',
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
  el.className = 'house-marker is-expanded'
  el.innerHTML = `
    <svg class="house-marker__leader" aria-hidden="true">
      <line />
    </svg>
    <div class="house-marker__card">
      <div class="house-marker__photo"></div>
      <span class="house-marker__state"></span>
      <div class="house-marker__body">
        <span class="house-marker__name"></span>
        <span class="house-marker__addr"></span>
        <p class="house-marker__bio"></p>
        <div class="house-marker__extra">
          <div class="house-marker__extra-inner">
            <div class="house-marker__meta">
              <span class="house-marker__age"></span>
              <span class="house-marker__views"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <span class="house-marker__pin"></span>
  `
  return el
}

/** First sentence of the bio for the compact card teaser. */
function bioTeaser(bio: string): string {
  const text = bio.trim()
  if (!text) {
    return ''
  }
  const match = text.match(/^[\s\S]*?[.!?](?:\s|$)/)
  const first = match ? match[0].trim() : text
  if (first.length <= 88) {
    return first
  }
  return `${first.slice(0, 85).trimEnd()}…`
}

function setMarkerBio(el: HTMLDivElement, isRich: boolean) {
  const bioEl = el.querySelector<HTMLElement>('.house-marker__bio')
  if (!bioEl) {
    return
  }
  const full = bioEl.dataset.full ?? ''
  const teaser = bioEl.dataset.teaser ?? full
  bioEl.textContent = isRich ? full : teaser
}

function populateMarker(el: HTMLDivElement, node: EnrichedNode, t: TFn) {
  const photo = el.querySelector<HTMLElement>('.house-marker__photo')
  if (photo && photo.dataset.src !== node.photo) {
    photo.dataset.src = node.photo
    photo.style.backgroundImage = `url("${node.photo}")`
  }
  el.querySelector('.house-marker__name')!.textContent = node.name || node.city || '—'
  el.querySelector('.house-marker__addr')!.textContent = node.street || node.city || '—'
  el.querySelector('.house-marker__state')!.textContent = statusTag(node, t)

  const bioEl = el.querySelector<HTMLElement>('.house-marker__bio')!
  const fullBio = node.bio ?? ''
  bioEl.dataset.full = fullBio
  bioEl.dataset.teaser = bioTeaser(fullBio)

  const isRich = el.classList.contains('is-rich')
  setMarkerBio(el, isRich)

  const a = getAnalytics(node)
  el.querySelector('.house-marker__age')!.textContent = t('marker.placedAgo', { days: a.daysOpen })
  el.querySelector('.house-marker__views')!.textContent = t('marker.views', { n: a.views })
}

export function NetworkMap({
  nodes,
  selectedId,
  onSelectNode,
  city,
  buildings3d,
  viewMode,
  asOf,
  onCursorLocation,
  onStreetSelect,
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
  const viewModeRef = useRef(viewMode)
  viewModeRef.current = viewMode
  const cityRef = useRef(city)
  cityRef.current = city
  const onSelectRef = useRef(onSelectNode)
  onSelectRef.current = onSelectNode
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const asOfRef = useRef(asOf)
  asOfRef.current = asOf
  const onCursorRef = useRef(onCursorLocation)
  onCursorRef.current = onCursorLocation
  const onStreetRef = useRef(onStreetSelect)
  onStreetRef.current = onStreetSelect
  const tRef = useRef(t)
  tRef.current = t
  const declutterRaf = useRef<number | null>(null)
  const cursorTimer = useRef<number | null>(null)
  const cursorAbort = useRef<AbortController | null>(null)

  // Depth-sort + organic screen-space placement (cards fan out with leader lines).
  const syncMarkerStates = useRef<() => void>(() => {})
  syncMarkerStates.current = () => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const hovered = hoveredRef.current
    const selected = selectedRef.current
    const asOfTs = asOfRef.current

    const isVisible = (n: EnrichedNode) =>
      !n.listed_at || new Date(n.listed_at).getTime() <= asOfTs

    type Row = {
      node: EnrichedNode
      pt: { x: number; y: number }
      entry: { marker: Marker; el: HTMLDivElement }
      isRich: boolean
    }

    const rows: Row[] = []
    for (const node of nodesRef.current) {
      const entry = markersRef.current.get(node.id)
      if (!entry) {
        continue
      }
      if (!isVisible(node) || !node.has_coordinates || node.longitude == null || node.latitude == null) {
        entry.el.style.display = 'none'
        continue
      }
      entry.el.style.display = ''
      const isRich = node.id === selected || node.id === hovered
      rows.push({
        node,
        pt: map.project([node.longitude, node.latitude]),
        entry,
        isRich,
      })
    }

    // Place back → front; focus card stays on its pin.
    const placementOrder = [...rows].sort((a, b) => {
      const focus = (id: string) => (id === selected ? 2 : id === hovered ? 1 : 0)
      const fa = focus(a.node.id)
      const fb = focus(b.node.id)
      if (fa !== fb) {
        return fa - fb
      }
      return a.pt.y - b.pt.y
    })

    const placed: ScreenRect[] = []
    const offsets = new globalThis.Map<string, Offset>()

    for (const { node, pt, isRich } of placementOrder) {
      const h = isRich ? CARD_H_RICH : CARD_H
      const off =
        isRich ? { ox: 0, oy: 0 } : pickOffset(pt.x, pt.y, h, placed)
      offsets.set(node.id, off)
      placed.push(cardScreenRect(pt.x, pt.y, off.ox, off.oy, h))
    }

    for (const { node, pt, entry, isRich } of rows) {
      const isSelected = node.id === selected
      const isHovered = node.id === hovered
      const off = offsets.get(node.id) ?? { ox: 0, oy: 0 }
      const cardH = isRich ? CARD_H_RICH : CARD_H

      entry.el.classList.add('is-expanded')
      entry.el.classList.remove('is-collapsed')
      entry.el.classList.toggle('is-rich', isRich)
      entry.el.classList.toggle('is-selected', isSelected)
      entry.el.classList.toggle('is-hovered', isHovered)
      entry.el.dataset.status = node.status
      setMarkerBio(entry.el, isRich)

      const card = entry.el.querySelector<HTMLElement>('.house-marker__card')
      if (card) {
        card.style.setProperty('--ox', `${off.ox}px`)
        card.style.setProperty('--oy', `${off.oy}px`)
      }
      updateLeaderLine(entry.el, off.ox, off.oy, cardH)

      let z = Z_DEPTH_BASE + Math.min(800, Math.floor(pt.y))
      if (isHovered) {
        z += Z_HOVER_BOOST
      }
      if (isSelected) {
        z += Z_SELECT_BOOST
      }
      entry.el.style.zIndex = String(z)
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
    const start3d = viewModeRef.current === '3d'
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: initial.center,
      zoom: initial.zoom,
      pitch: start3d ? initial.pitch : 0,
      bearing: start3d ? initial.bearing : 0,
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

    // Live cursor location (debounced reverse geocode).
    map.on('mousemove', (e) => {
      if (cursorTimer.current != null) {
        window.clearTimeout(cursorTimer.current)
      }
      cursorTimer.current = window.setTimeout(() => {
        cursorAbort.current?.abort()
        const ctrl = new AbortController()
        cursorAbort.current = ctrl
        reverseGeocode(e.lngLat.lat, e.lngLat.lng, ctrl.signal)
          .then((loc) => onCursorRef.current(loc))
          .catch(() => {})
      }, 320)
    })

    map.on('mouseout', () => {
      if (cursorTimer.current != null) {
        window.clearTimeout(cursorTimer.current)
        cursorTimer.current = null
      }
      onCursorRef.current(null)
    })

    map.on('click', (e) => {
      // Clicking a marker is handled by the marker; clicking empty map opens the
      // street view (entries on that street) and clears node selection.
      if ((e.originalEvent.target as HTMLElement)?.closest('.house-marker')) {
        return
      }
      onSelectRef.current(null)
      reverseGeocode(e.lngLat.lat, e.lngLat.lng)
        .then((loc) => {
          const street = loc?.street ?? null
          const wijk = loc?.neighborhood ?? null
          const matches = nodesRef.current.filter((n) => {
            const byStreet = street ? streetMatches(n.street, street) : false
            const byWijk = wijk
              ? (n.neighborhood ?? '').toLowerCase() === wijk.toLowerCase()
              : false
            return byStreet || byWijk
          })
          onStreetRef.current({ street, neighborhood: wijk, matches })
        })
        .catch(() => {})
    })

    mapRef.current = map
    return () => {
      if (declutterRaf.current != null) {
        cancelAnimationFrame(declutterRaf.current)
        declutterRaf.current = null
      }
      if (cursorTimer.current != null) {
        window.clearTimeout(cursorTimer.current)
        cursorTimer.current = null
      }
      cursorAbort.current?.abort()
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
          syncMarkerStates.current()
        })
        el.addEventListener('mouseleave', () => {
          if (hoveredRef.current === node.id) {
            hoveredRef.current = null
          }
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
      populateMarker(entry.el, node, tRef.current)
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

  // Re-sync visual states when selection, data or the time cursor changes.
  useEffect(() => {
    syncMarkerStates.current()
  }, [selectedId, nodes, asOf])

  // City change → smooth fly (respects 2D / 3D view mode).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !city) {
      return
    }
    const is3d = viewMode === '3d'
    map.flyTo({
      center: city.center,
      zoom: city.zoom,
      pitch: is3d ? city.pitch : 0,
      bearing: is3d ? city.bearing : 0,
      duration: 1600,
      essential: true,
    })
  }, [city, viewMode])

  // Click-to-zoom on selected node.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) {
      return
    }
    const node = nodesRef.current.find((n) => n.id === selectedId)
    if (node?.longitude != null && node?.latitude != null) {
      const is3d = viewMode === '3d'
      map.flyTo({
        center: [node.longitude, node.latitude],
        zoom: Math.max(map.getZoom(), 15.5),
        pitch: is3d ? Math.max(map.getPitch(), 50) : 0,
        duration: 1200,
        essential: true,
      })
    }
  }, [selectedId, viewMode])

  // Building extrusions only in 3D view (when enabled in settings).
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const showBuildings = buildings3d && viewMode === '3d'
    const apply = () => {
      if (!map.getLayer(BUILDINGS_LAYER)) {
        addBuildingsLayer(map, showBuildings)
      }
      if (map.getLayer(BUILDINGS_LAYER)) {
        map.setLayoutProperty(BUILDINGS_LAYER, 'visibility', showBuildings ? 'visible' : 'none')
      }
    }
    if (map.isStyleLoaded()) {
      apply()
    } else {
      map.once('load', apply)
    }
  }, [buildings3d, viewMode])

  // Toggle birds-eye ↔ 3D perspective (camera pitch).
  useEffect(() => {
    const map = mapRef.current
    const c = cityRef.current
    if (!map || !c) {
      return
    }
    const is3d = viewMode === '3d'
    map.easeTo({
      pitch: is3d ? c.pitch : 0,
      bearing: is3d ? c.bearing : 0,
      duration: 900,
    })
  }, [viewMode])

  return (
    <div className="network-map-wrap">
      <div ref={containerRef} className="network-map" />
      <div className="map-vignette" aria-hidden="true" />
    </div>
  )
}
