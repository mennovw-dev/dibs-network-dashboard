import type { EnrichedNode } from './houses'
import { convexHullLngLat, expandHull, hullToPolygon, type LngLat } from './clusterGeo'
import { sortDrawerListings } from './listingSort'
import type { MapClusterGroup } from './mapClusterIndex'

function centroid(points: LngLat[]): LngLat {
  let lng = 0
  let lat = 0
  for (const [x, y] of points) {
    lng += x
    lat += y
  }
  return [lng / points.length, lat / points.length]
}

function inBbox(lng: number, lat: number, bbox: [number, number, number, number]): boolean {
  const [west, south, east, north] = bbox
  return lng >= west && lng <= east && lat >= south && lat <= north
}

/**
 * Stable wijk-based clusters — do not jump +8 → +4 on zoom like Supercluster alone.
 */
export function getNeighborhoodClusters(
  nodes: EnrichedNode[],
  bbox: [number, number, number, number],
  minPoints = 2,
): MapClusterGroup[] {
  const inView = nodes.filter(
    (n) =>
      n.has_coordinates &&
      n.longitude != null &&
      n.latitude != null &&
      inBbox(n.longitude, n.latitude, bbox),
  )

  const byHood = new globalThis.Map<string, EnrichedNode[]>()
  for (const n of inView) {
    const hood = (n.neighborhood ?? '').trim() || 'Overig'
    const list = byHood.get(hood) ?? []
    list.push(n)
    byHood.set(hood, list)
  }

  const groups: MapClusterGroup[] = []
  let clusterId = -1

  for (const [hood, members] of byHood) {
    if (members.length < minPoints) {
      continue
    }
    const points: LngLat[] = members.map((n) => [n.longitude!, n.latitude!])
    const hull = expandHull(convexHullLngLat(points))
    groups.push({
      id: `hood-${hood.toLowerCase().replace(/\s+/g, '-')}`,
      clusterId: clusterId--,
      count: members.length,
      center: centroid(points),
      nodeIds: members.map((n) => n.id),
      nodes: sortDrawerListings(members),
      hull,
      polygon: hullToPolygon(hull),
    })
  }

  return groups
}

/** Prefer wijk clusters; Supercluster fills gaps for loadtest-scale data. */
export function mergeClusterGroups(
  neighborhood: MapClusterGroup[],
  supercluster: MapClusterGroup[],
): MapClusterGroup[] {
  const claimed = new Set<string>()
  for (const g of neighborhood) {
    for (const id of g.nodeIds) {
      claimed.add(id)
    }
  }

  const extra = supercluster.filter((g) => {
    const unclaimed = g.nodeIds.filter((id) => !claimed.has(id))
    return unclaimed.length >= Math.min(3, g.count)
  })

  return [...neighborhood, ...extra]
}
