import type { Feature, FeatureCollection, Point } from 'geojson'
import type { ListingNode } from '../types'

export function nodesToGeoJSON(nodes: ListingNode[]): FeatureCollection<Point> {
  const features: Feature<Point>[] = nodes
    .filter((node) => node.has_coordinates && node.latitude != null && node.longitude != null)
    .map((node) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [node.longitude!, node.latitude!],
      },
      properties: {
        id: node.id,
        house_id: node.house_id,
        name: node.name,
        city: node.city,
        status: node.status,
        reactions_count: node.reactions_count,
        reactions_max: node.reactions_max,
      },
    }))

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#22c55e'
    case 'paused':
      return '#eab308'
    case 'closed':
      return '#ef4444'
    case 'draft':
      return '#94a3b8'
    default:
      return '#38bdf8'
  }
}
