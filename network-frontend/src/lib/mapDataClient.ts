import type { FeatureCollection, Point } from 'geojson'

export interface ViewportAggregateRequest {
  west: number
  south: number
  east: number
  north: number
  zoom: number
  asOf?: number
}

export interface ViewportAggregateResponse {
  listings: FeatureCollection<Point>
  reactions: FeatureCollection<Point>
  clusters?: FeatureCollection<Point>
}

/**
 * Future server-side tiling / aggregation entry point.
 * Today returns null — client builds indexes locally.
 */
export async function fetchViewportAggregates(
  _req: ViewportAggregateRequest,
  signal?: AbortSignal,
): Promise<ViewportAggregateResponse | null> {
  const base = import.meta.env.VITE_MAP_TILES_URL
  if (!base) {
    return null
  }

  try {
    const url = new URL('/viewport', base)
    const res = await fetch(url, { signal })
    if (!res.ok) {
      return null
    }
    return (await res.json()) as ViewportAggregateResponse
  } catch {
    return null
  }
}
