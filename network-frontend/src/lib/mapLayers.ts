import maplibregl, { type Map } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { MAP_STATUS_COLORS } from './status'

export const LISTINGS_SOURCE = 'dibs-listings'
export const LISTINGS_DOTS = 'dibs-listings-dots'
export const LISTINGS_GLOW = 'dibs-listings-glow'
export const REACTIONS_SOURCE = 'dibs-reactions-heat'
export const REACTIONS_HEATMAP = 'dibs-reactions-heatmap'

const EMPTY_FC: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] }

export function ensureListingLayers(map: Map) {
  if (!map.getSource(LISTINGS_SOURCE)) {
    map.addSource(LISTINGS_SOURCE, {
      type: 'geojson',
      data: EMPTY_FC,
      promoteId: 'id',
    })
  }

  if (!map.getLayer(LISTINGS_GLOW)) {
    map.addLayer({
      id: LISTINGS_GLOW,
      type: 'circle',
      source: LISTINGS_SOURCE,
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'focus'], false],
          16,
          ['boolean', ['feature-state', 'hover'], false],
          14,
          ['boolean', ['feature-state', 'selected'], false],
          13,
          0,
        ],
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'focus'], false],
          'rgba(255, 200, 97, 0.35)',
          ['boolean', ['feature-state', 'hover'], false],
          'rgba(255, 200, 97, 0.22)',
          'rgba(111, 179, 173, 0.2)',
        ],
        'circle-blur': 0.85,
      },
    })
  }

  if (!map.getLayer(LISTINGS_DOTS)) {
    map.addLayer({
      id: LISTINGS_DOTS,
      type: 'circle',
      source: LISTINGS_SOURCE,
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'focus'], false],
          7,
          ['boolean', ['feature-state', 'hover'], false],
          6.5,
          5.5,
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
          MAP_STATUS_COLORS.draft,
        ],
        'circle-stroke-width': [
          'case',
          ['boolean', ['feature-state', 'focus'], false],
          2.5,
          ['boolean', ['feature-state', 'hover'], false],
          2,
          1.5,
        ],
        'circle-stroke-color': [
          'case',
          ['boolean', ['feature-state', 'focus'], false],
          '#ffc861',
          ['boolean', ['feature-state', 'hover'], false],
          '#ffe4a8',
          '#ffffff',
        ],
      },
    })
  }
}

export function ensureReactionHeatmapLayer(map: Map) {
  if (!map.getSource(REACTIONS_SOURCE)) {
    map.addSource(REACTIONS_SOURCE, {
      type: 'geojson',
      data: EMPTY_FC,
    })
  }

  if (!map.getLayer(REACTIONS_HEATMAP)) {
    map.addLayer(
      {
        id: REACTIONS_HEATMAP,
        type: 'heatmap',
        source: REACTIONS_SOURCE,
        maxzoom: 16,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 15, 1.4],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.15,
            'rgba(180, 24, 40, 0.15)',
            0.45,
            'rgba(220, 48, 56, 0.45)',
            0.75,
            'rgba(255, 72, 64, 0.72)',
            1,
            'rgba(255, 120, 96, 0.92)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 12, 15, 28],
          'heatmap-opacity': 0.72,
        },
        layout: { visibility: 'none' },
      },
      LISTINGS_GLOW,
    )
  }
}

export function setListingsGeoJSON(map: Map, data: FeatureCollection<Point>) {
  ensureListingLayers(map)
  const src = map.getSource(LISTINGS_SOURCE) as maplibregl.GeoJSONSource | undefined
  src?.setData(data)
}

export function setReactionHeatGeoJSON(map: Map, data: FeatureCollection<Point>) {
  ensureReactionHeatmapLayer(map)
  const src = map.getSource(REACTIONS_SOURCE) as maplibregl.GeoJSONSource | undefined
  src?.setData(data)
}

export function setReactionHeatmapVisible(map: Map, visible: boolean) {
  if (!map.getLayer(REACTIONS_HEATMAP)) {
    return
  }
  map.setLayoutProperty(REACTIONS_HEATMAP, 'visibility', visible ? 'visible' : 'none')
}

export function setListingFeatureStates(
  map: Map,
  nodeIds: string[],
  states: { hover?: string | null; selected?: string | null; focus?: string | null },
) {
  if (!map.getSource(LISTINGS_SOURCE)) {
    return
  }
  for (const id of nodeIds) {
    map.setFeatureState(
      { source: LISTINGS_SOURCE, id },
      {
        hover: id === states.hover,
        selected: id === states.selected,
        focus: id === states.focus,
      },
    )
  }
}

export function clearListingFeatureStates(map: Map, nodeIds: string[]) {
  for (const id of nodeIds) {
    try {
      map.removeFeatureState({ source: LISTINGS_SOURCE, id })
    } catch {
      // feature may not exist yet
    }
  }
}
