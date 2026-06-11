import type { Feature, FeatureCollection, Point } from 'geojson'
import type { CompactNode } from './compactNode'

export function compactNodesToGeoJSON(nodes: CompactNode[]): FeatureCollection<Point> {
  const features: Feature<Point>[] = nodes.map((node) => ({
    type: 'Feature',
    id: node.id,
    geometry: {
      type: 'Point',
      coordinates: [node.lng, node.lat],
    },
    properties: {
      id: node.id,
      status: node.status,
      reactions_count: node.reactions_count,
      reactions_max: node.reactions_max,
    },
  }))

  return { type: 'FeatureCollection', features }
}
