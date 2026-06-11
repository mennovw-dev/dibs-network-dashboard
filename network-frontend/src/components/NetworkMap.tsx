import { useEffect, useRef, useState } from 'react'
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
import type { MapClusterGroup } from '../lib/mapClusterIndex'
import {
  clusterSelectionFromGroup,
  type ClusterSelection,
} from '../lib/mapLod'
import { pointInPolygon as pip } from '../lib/clusterGeo'
import { compactFromEnriched } from '../lib/compactNode'
import { compactNodesToGeoJSON } from '../lib/listingsGeoJSON'
import {
  clearListingFeatureStates,
  ensureListingLayers,
  ensureReactionHeatmapLayer,
  LISTINGS_DOTS,
  setListingFeatureStates,
  setListingsGeoJSON,
  setReactionHeatGeoJSON,
  setReactionHeatmapVisible,
} from '../lib/mapLayers'
import { buildReactionHeatPoints } from '../lib/reactionHeatmap'
import { MAP_CONFIG } from '../lib/mapConfig'
import type { LodEngineResult } from '../lib/lodCore'
import { useMapLodEngine } from '../hooks/useMapLodEngine'
import { perfModeEnabled, PerfHud, type PerfSnapshot } from './PerfHud'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const BUILDINGS_LAYER = 'dibs-3d-buildings'
const BUILDINGS_MIN_ZOOM = 13
const CLUSTER_HULL_SOURCE = 'dibs-cluster-hull'
const CLUSTER_HULL_FILL = 'dibs-cluster-hull-fill'
const CLUSTER_HULL_LINE = 'dibs-cluster-hull-line'

const Z_DEPTH_BASE = 10
const Z_HOVER_BOOST = 5000
const Z_SELECT_BOOST = 6000
const Z_DRAWER_FOCUS_BOOST = 4500

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
  activeCluster: ClusterSelection | null
  onOpenCluster: (cluster: ClusterSelection | null) => void
  drawerHighlightId: string | null
  onDrawerHighlight: (id: string | null) => void
  showReactionHeatmap: boolean
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

function ensureClusterHullLayers(map: Map) {
  if (!map.getSource(CLUSTER_HULL_SOURCE)) {
    map.addSource(CLUSTER_HULL_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer(CLUSTER_HULL_FILL)) {
    map.addLayer({
      id: CLUSTER_HULL_FILL,
      type: 'fill',
      source: CLUSTER_HULL_SOURCE,
      paint: {
        'fill-color': 'rgba(255, 200, 97, 0.06)',
        'fill-opacity': 1,
      },
    })
  }
  if (!map.getLayer(CLUSTER_HULL_LINE)) {
    map.addLayer({
      id: CLUSTER_HULL_LINE,
      type: 'line',
      source: CLUSTER_HULL_SOURCE,
      paint: {
        'line-color': 'rgba(255, 200, 97, 0.42)',
        'line-width': 1.5,
        'line-dasharray': [2, 2],
      },
    })
  }
}

function setClusterHull(map: Map, polygon: GeoJSON.Polygon | null) {
  ensureClusterHullLayers(map)
  const data: GeoJSON.FeatureCollection = polygon
    ? {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: polygon, properties: {} }],
      }
    : { type: 'FeatureCollection', features: [] }
  const src = map.getSource(CLUSTER_HULL_SOURCE) as maplibregl.GeoJSONSource
  src?.setData(data)
}

function buildMarkerEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'house-marker is-expanded house-marker--overlay'
  el.innerHTML = `
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

function buildClusterBadgeEl(count: number): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'cluster-badge'
  btn.setAttribute('aria-label', `${count} listings`)
  btn.textContent = `+${count}`
  return btn
}

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

function clusterLabel(group: MapClusterGroup, t: TFn): string {
  const hood = group.nodes.find((n) => n.neighborhood)?.neighborhood
  if (hood) {
    return hood
  }
  const street = group.nodes.find((n) => n.street)?.street
  if (street) {
    return street
  }
  return t('cluster.area')
}

function updateWebglPinFilter(map: Map, domIds: string[]) {
  if (!map.getLayer(LISTINGS_DOTS)) {
    return
  }
  const filter: maplibregl.FilterSpecification =
    domIds.length > 0 ? ['!', ['in', ['get', 'id'], ['literal', domIds]]] : true
  map.setFilter(LISTINGS_DOTS, filter)
  map.setFilter('dibs-listings-glow', filter)
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
  activeCluster,
  onOpenCluster,
  drawerHighlightId,
  onDrawerHighlight,
  showReactionHeatmap,
}: NetworkMapProps) {
  const t = useT()
  const { compute } = useMapLodEngine()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<globalThis.Map<string, { marker: Marker; el: HTMLDivElement }>>(
    new globalThis.Map(),
  )
  const clusterBadgesRef = useRef<
    globalThis.Map<string, { marker: Marker; el: HTMLButtonElement }>
  >(new globalThis.Map())
  const hoveredRef = useRef<string | null>(null)
  const prevZoomRef = useRef<number>(0)
  const lodRaf = useRef<number | null>(null)
  const lodGenRef = useRef(0)
  const featureStateIdsRef = useRef<string[]>([])
  const lastLodRef = useRef<LodEngineResult | null>(null)
  const [perfSnap, setPerfSnap] = useState<PerfSnapshot | null>(null)
  const showPerf = perfModeEnabled()

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
  const activeClusterRef = useRef(activeCluster)
  activeClusterRef.current = activeCluster
  const onOpenClusterRef = useRef(onOpenCluster)
  onOpenClusterRef.current = onOpenCluster
  const drawerHighlightRef = useRef(drawerHighlightId)
  drawerHighlightRef.current = drawerHighlightId
  const onDrawerHighlightRef = useRef(onDrawerHighlight)
  onDrawerHighlightRef.current = onDrawerHighlight
  const showHeatRef = useRef(showReactionHeatmap)
  showHeatRef.current = showReactionHeatmap
  const tRef = useRef(t)
  tRef.current = t
  const cursorTimer = useRef<number | null>(null)
  const cursorAbort = useRef<AbortController | null>(null)
  const computeRef = useRef(compute)
  computeRef.current = compute

  const openClusterGroup = (group: MapClusterGroup) => {
    onSelectRef.current(null)
    const label = clusterLabel(group, tRef.current)
    onOpenClusterRef.current(clusterSelectionFromGroup(group, label))
    const map = mapRef.current
    if (map && group.polygon) {
      setClusterHull(map, group.polygon)
    }
  }

  const closeCluster = () => {
    onOpenClusterRef.current(null)
    onDrawerHighlightRef.current(null)
    const map = mapRef.current
    if (map) {
      setClusterHull(map, null)
    }
  }

  const dismissMapFocus = () => {
    const hadCluster = !!activeClusterRef.current
    const hadSelection = !!selectedRef.current
    closeCluster()
    if (hadSelection) {
      onSelectRef.current(null)
    }
    hoveredRef.current = null
    if (hadCluster || hadSelection) {
      scheduleLod.current()
    }
  }

  const applyDomMarker = (
    node: EnrichedNode,
    lod: LodEngineResult,
    hovered: string | null,
    selected: string | null,
    drawerFocus: string | null,
    map: Map,
  ) => {
    const entry = markersRef.current.get(node.id)
    if (!entry) {
      return
    }

    const pt = map.project([node.longitude!, node.latitude!])
    const isSelected = node.id === selected
    const isHovered = node.id === hovered
    const isDrawerFocus = node.id === drawerFocus
    const inActiveCluster = activeClusterRef.current?.nodes.some((n) => n.id === node.id) ?? false
    const isClusterMember = lod.clusterMemberIds.includes(node.id)

    const showCard =
      inActiveCluster
        ? false
        : lod.cardIds.includes(node.id) ||
          (isHovered && !inActiveCluster) ||
          (isSelected && !inActiveCluster)

    const isRich = inActiveCluster ? false : isHovered || isSelected

    entry.el.classList.toggle('is-pin-only', !showCard)
    entry.el.classList.toggle('is-rich', isRich)
    entry.el.classList.toggle('is-selected', isSelected)
    entry.el.classList.toggle('is-hovered', isHovered && !inActiveCluster)
    entry.el.classList.toggle('is-drawer-focus', inActiveCluster && isDrawerFocus)
    entry.el.classList.toggle('is-cluster-member', isClusterMember && !inActiveCluster)
    entry.el.dataset.status = node.status
    setMarkerBio(entry.el, isRich)

    let z = Z_DEPTH_BASE + Math.min(800, Math.floor(pt.y))
    if (isDrawerFocus) {
      z += Z_DRAWER_FOCUS_BOOST
    }
    if (isHovered) {
      z += Z_HOVER_BOOST
    }
    if (isSelected) {
      z += Z_SELECT_BOOST
    }
    entry.el.style.zIndex = String(z)
  }

  const syncDomMarkerPool = (lod: LodEngineResult, map: Map) => {
    const nodeById = new globalThis.Map(nodesRef.current.map((n) => [n.id, n]))
    const domIds = new Set(lod.domMarkerIds)
    const hovered = hoveredRef.current
    const selected = selectedRef.current
    const drawerFocus = drawerHighlightRef.current

    for (const id of domIds) {
      const node = nodeById.get(id)
      if (!node?.has_coordinates || node.longitude == null || node.latitude == null) {
        continue
      }

      let entry = markersRef.current.get(id)
      if (!entry) {
        const el = buildMarkerEl()
        el.dataset.id = id
        el.addEventListener('mouseenter', () => {
          hoveredRef.current = id
          if (activeClusterRef.current?.nodes.some((n) => n.id === id)) {
            onDrawerHighlightRef.current(id)
          }
          scheduleLod.current()
        })
        el.addEventListener('mouseleave', () => {
          if (hoveredRef.current === id) {
            hoveredRef.current = null
          }
          if (
            activeClusterRef.current?.nodes.some((n) => n.id === id) &&
            drawerHighlightRef.current === id
          ) {
            onDrawerHighlightRef.current(null)
          }
          scheduleLod.current()
        })
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          const current = nodesRef.current.find((n) => n.id === id)
          if (activeClusterRef.current?.nodes.some((n) => n.id === id)) {
            onDrawerHighlightRef.current(id)
          }
          onSelectRef.current(current ?? null)
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([node.longitude, node.latitude])
          .addTo(map)
        entry = { marker, el }
        markersRef.current.set(id, entry)
      } else {
        entry.marker.setLngLat([node.longitude, node.latitude])
      }

      populateMarker(entry.el, node, tRef.current)
      entry.el.style.display = ''
      applyDomMarker(node, lod, hovered, selected, drawerFocus, map)
    }

    for (const [id, entry] of markersRef.current) {
      if (!domIds.has(id)) {
        entry.marker.remove()
        markersRef.current.delete(id)
      }
    }

    updateWebglPinFilter(map, [...domIds])
  }

  const applyLodResult = (lod: LodEngineResult) => {
    const map = mapRef.current
    if (!map) {
      return
    }

    lastLodRef.current = lod
    const active = activeClusterRef.current
    const focusId = drawerHighlightRef.current ?? selectedRef.current

    prevZoomRef.current = map.getZoom()

    const badgeGroups = active
      ? lod.multiClusters.filter((g) => g.id !== active.id)
      : lod.multiClusters
    const seenBadges = new Set<string>()
    for (const group of badgeGroups) {
      seenBadges.add(group.id)
      let entry = clusterBadgesRef.current.get(group.id)
      if (!entry) {
        const el = buildClusterBadgeEl(group.count)
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          openClusterGroup(group)
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(group.center)
          .addTo(map)
        entry = { marker, el }
        clusterBadgesRef.current.set(group.id, entry)
      } else {
        entry.marker.setLngLat(group.center)
        entry.el.textContent = `+${group.count}`
      }
    }
    for (const [id, entry] of clusterBadgesRef.current) {
      if (!seenBadges.has(id)) {
        entry.marker.remove()
        clusterBadgesRef.current.delete(id)
      }
    }

    if (active?.polygon) {
      setClusterHull(map, active.polygon)
    } else if (!active) {
      setClusterHull(map, null)
    }

    syncDomMarkerPool(lod, map)

    const visibleIds = nodesRef.current
      .filter((n) => n.has_coordinates)
      .map((n) => n.id)
    clearListingFeatureStates(map, featureStateIdsRef.current)
    setListingFeatureStates(map, visibleIds, {
      hover: hoveredRef.current,
      selected: selectedRef.current,
      focus: focusId,
    })
    featureStateIdsRef.current = visibleIds

    if (showPerf) {
      setPerfSnap({
        tier: lod.tier,
        nodeCount: nodesRef.current.length,
        domMarkers: lod.domMarkerIds.length,
        lodMs: lod.elapsedMs,
        worker: nodesRef.current.length >= MAP_CONFIG.lodWorkerMinNodes,
      })
    }
  }

  const runLod = useRef<() => void>(() => {})
  runLod.current = () => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const asOfTs = asOfRef.current
    const isVisible = (n: EnrichedNode) =>
      !n.listed_at || new Date(n.listed_at).getTime() <= asOfTs

    const compactNodes = nodesRef.current
      .filter(
        (n) =>
          isVisible(n) && n.has_coordinates && n.longitude != null && n.latitude != null,
      )
      .map((n) => compactFromEnriched(n)!)

    const bounds = map.getBounds()
    const center = map.getCenter()
    const gen = ++lodGenRef.current

    computeRef
      .current({
        compactNodes,
        bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom: map.getZoom(),
        prevZoom: prevZoomRef.current,
        mapCenter: [center.lng, center.lat],
        hoveredId: hoveredRef.current,
        selectedId: selectedRef.current,
        drawerHighlightId: drawerHighlightRef.current,
        activeCluster: activeClusterRef.current,
      })
      .then((result) => {
        if (gen !== lodGenRef.current) {
          return
        }
        applyLodResult(result)
      })
  }

  const scheduleLod = useRef<() => void>(() => {})
  scheduleLod.current = () => {
    if (lodRaf.current != null) {
      return
    }
    lodRaf.current = requestAnimationFrame(() => {
      lodRaf.current = null
      runLod.current()
    })
  }

  const syncGeoLayers = useRef<() => void>(() => {})
  syncGeoLayers.current = () => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }

    const asOfTs = asOfRef.current
    const compact = nodesRef.current
      .filter(
        (n) =>
          (!n.listed_at || new Date(n.listed_at).getTime() <= asOfTs) &&
          n.has_coordinates &&
          n.longitude != null &&
          n.latitude != null,
      )
      .map((n) => compactFromEnriched(n)!)

    setListingsGeoJSON(map, compactNodesToGeoJSON(compact))
    setReactionHeatGeoJSON(map, buildReactionHeatPoints(compact))
    setReactionHeatmapVisible(map, showHeatRef.current)
  }

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
      ensureClusterHullLayers(map)
      ensureListingLayers(map)
      ensureReactionHeatmapLayer(map)
      prevZoomRef.current = map.getZoom()
      syncGeoLayers.current()
      runLod.current()
    })

    map.on('move', () => scheduleLod.current())
    map.on('zoom', () => scheduleLod.current())

    map.on('mousemove', LISTINGS_DOTS, (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const f = e.features?.[0]
      const id = f?.properties?.id as string | undefined
      if (id && hoveredRef.current !== id) {
        hoveredRef.current = id
        if (activeClusterRef.current?.nodes.some((n) => n.id === id)) {
          onDrawerHighlightRef.current(id)
        }
        scheduleLod.current()
      }
    })

    map.on('mouseleave', LISTINGS_DOTS, () => {
      map.getCanvas().style.cursor = ''
      if (hoveredRef.current) {
        hoveredRef.current = null
        onDrawerHighlightRef.current(null)
        scheduleLod.current()
      }
    })

    map.on('click', LISTINGS_DOTS, (e) => {
      const f = e.features?.[0]
      const id = f?.properties?.id as string | undefined
      if (!id) {
        return
      }
      const node = nodesRef.current.find((n) => n.id === id)
      if (node) {
        if (activeClusterRef.current?.nodes.some((n) => n.id === id)) {
          onDrawerHighlightRef.current(id)
        }
        onSelectRef.current(node)
      }
    })

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
      if ((e.originalEvent.target as HTMLElement)?.closest('.house-marker, .cluster-badge')) {
        return
      }

      const active = activeClusterRef.current
      if (active?.polygon) {
        const ring = active.polygon.coordinates[0]
        if (pip(e.lngLat.lng, e.lngLat.lat, ring)) {
          return
        }
        dismissMapFocus()
        return
      }

      if (selectedRef.current) {
        dismissMapFocus()
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
      if (lodRaf.current != null) {
        cancelAnimationFrame(lodRaf.current)
        lodRaf.current = null
      }
      if (cursorTimer.current != null) {
        window.clearTimeout(cursorTimer.current)
        cursorTimer.current = null
      }
      cursorAbort.current?.abort()
      for (const entry of clusterBadgesRef.current.values()) {
        entry.marker.remove()
      }
      clusterBadgesRef.current.clear()
      for (const entry of markersRef.current.values()) {
        entry.marker.remove()
      }
      markersRef.current.clear()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    syncGeoLayers.current()
    scheduleLod.current()
  }, [nodes, asOf, showReactionHeatmap])

  useEffect(() => {
    scheduleLod.current()
  }, [selectedId, activeCluster, drawerHighlightId])

  useEffect(() => {
    if (!activeCluster) {
      const map = mapRef.current
      if (map?.isStyleLoaded()) {
        setClusterHull(map, null)
      }
    }
  }, [activeCluster])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return
      }
      if (activeClusterRef.current || selectedRef.current) {
        e.preventDefault()
        dismissMapFocus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      {showPerf && <PerfHud snapshot={perfSnap} />}
    </div>
  )
}
