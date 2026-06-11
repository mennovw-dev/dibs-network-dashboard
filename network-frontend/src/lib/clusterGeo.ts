import type { Position } from 'geojson'

export type LngLat = [number, number]

/** Convex hull (monotone chain) for lng/lat rings — fine for small neighbourhood clusters. */
export function convexHullLngLat(points: LngLat[]): LngLat[] {
  if (points.length < 3) {
    return points.length ? [...points] : []
  }

  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])

  const cross = (o: LngLat, a: LngLat, b: LngLat) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  const lower: LngLat[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper: LngLat[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

export function hullToPolygon(hull: LngLat[]): GeoJSON.Polygon | null {
  if (hull.length < 3) {
    return null
  }
  const ring: Position[] = [...hull, hull[0]]
  return { type: 'Polygon', coordinates: [ring] }
}

/** Ray-casting point-in-polygon for a GeoJSON ring. */
export function pointInPolygon(lng: number, lat: number, ring: Position[]): boolean {
  if (ring.length < 3) {
    return false
  }
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) {
      inside = !inside
    }
  }
  return inside
}

export function expandHull(hull: LngLat[], paddingDeg = 0.00035): LngLat[] {
  if (hull.length === 0) {
    return hull
  }
  let cx = 0
  let cy = 0
  for (const [lng, lat] of hull) {
    cx += lng
    cy += lat
  }
  cx /= hull.length
  cy /= hull.length
  return hull.map(([lng, lat]) => {
    const dx = lng - cx
    const dy = lat - cy
    const len = Math.hypot(dx, dy) || 1
    return [cx + (dx / len) * (len + paddingDeg), cy + (dy / len) * (len + paddingDeg)] as LngLat
  })
}
