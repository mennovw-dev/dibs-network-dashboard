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

export { MAP_STATUS_COLORS as statusColor } from './status'
