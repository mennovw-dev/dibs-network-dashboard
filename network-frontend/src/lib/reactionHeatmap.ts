import type { Feature, FeatureCollection, Point } from 'geojson'
import type { CompactNode } from './compactNode'

/** Synthetic reaction points around listings — placeholder until live reaction stream. */
export function buildReactionHeatPoints(nodes: CompactNode[]): FeatureCollection<Point> {
  const features: Feature<Point>[] = []

  for (const node of nodes) {
    const weightBase = Math.max(1, node.reactions_count)
    const spread = Math.min(12, Math.ceil(weightBase / 3))

    for (let i = 0; i < spread; i++) {
      const angle = (i / spread) * Math.PI * 2 + node.id.charCodeAt(0)
      const r = 0.00012 + (i % 3) * 0.00006
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [node.lng + Math.cos(angle) * r, node.lat + Math.sin(angle) * r],
        },
        properties: {
          weight: 0.35 + (weightBase / Math.max(1, node.reactions_max || 24)) * 0.65,
          nodeId: node.id,
        },
      })
    }
  }

  return { type: 'FeatureCollection', features }
}
