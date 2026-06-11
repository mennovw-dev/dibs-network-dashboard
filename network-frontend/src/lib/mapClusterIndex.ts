import Supercluster from 'supercluster'
import type { EnrichedNode } from './houses'
import { convexHullLngLat, expandHull, hullToPolygon, type LngLat } from './clusterGeo'
import { sortDrawerListings } from './listingSort'

export const CLUSTER_MIN_POINTS = 4
export const SUPERCLUSTER_RADIUS = 56
export const SUPERCLUSTER_MAX_ZOOM = 17

export interface MapClusterGroup {
  id: string
  clusterId: number
  count: number
  center: LngLat
  nodeIds: string[]
  nodes: EnrichedNode[]
  hull: LngLat[]
  polygon: GeoJSON.Polygon | null
}

type ClusterProps = {
  cluster: true
  cluster_id: number
  point_count: number
  point_count_abbreviated: string | number
}

type LeafProps = {
  cluster?: false
  nodeId: string
}

type ScProps = ClusterProps | LeafProps

function nodeToFeature(node: EnrichedNode): GeoJSON.Feature<GeoJSON.Point, LeafProps> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [node.longitude!, node.latitude!],
    },
    properties: { nodeId: node.id },
  }
}

export class MapClusterIndex {
  private index = new Supercluster<LeafProps, ClusterProps>({
    radius: SUPERCLUSTER_RADIUS,
    maxZoom: SUPERCLUSTER_MAX_ZOOM,
  })

  private nodeById = new globalThis.Map<string, EnrichedNode>()

  load(nodes: EnrichedNode[]) {
    const plotted = nodes.filter(
      (n) => n.has_coordinates && n.longitude != null && n.latitude != null,
    )
    this.nodeById = new globalThis.Map(plotted.map((n) => [n.id, n]))
    this.index.load(plotted.map(nodeToFeature))
  }

  getClustersInView(
    bbox: [number, number, number, number],
    zoom: number,
  ): Array<GeoJSON.Feature<GeoJSON.Point, ScProps>> {
    return this.index.getClusters(bbox, Math.floor(zoom)) as Array<
      GeoJSON.Feature<GeoJSON.Point, ScProps>
    >
  }

  buildClusterGroup(
    feature: GeoJSON.Feature<GeoJSON.Point, ClusterProps>,
  ): MapClusterGroup | null {
    const clusterId = feature.properties.cluster_id
    const leaves = this.index.getLeaves(clusterId, Infinity) as Array<
      GeoJSON.Feature<GeoJSON.Point, LeafProps>
    >
    const nodes = leaves
      .map((f) => this.nodeById.get(f.properties.nodeId))
      .filter((n): n is EnrichedNode => n != null)

    if (nodes.length < CLUSTER_MIN_POINTS) {
      return null
    }

    const points: LngLat[] = nodes.map((n) => [n.longitude!, n.latitude!])
    const hull = expandHull(convexHullLngLat(points))
    const [lng, lat] = feature.geometry.coordinates as LngLat

    return {
      id: `cluster-${clusterId}`,
      clusterId,
      count: nodes.length,
      center: [lng, lat],
      nodeIds: nodes.map((n) => n.id),
      nodes: sortDrawerListings(nodes),
      hull,
      polygon: hullToPolygon(hull),
    }
  }

  getLeafNodeIds(features: Array<GeoJSON.Feature<GeoJSON.Point, ScProps>>): string[] {
    const ids: string[] = []
    for (const f of features) {
      const props = f.properties
      if ('cluster' in props && props.cluster) {
        continue
      }
      if ('nodeId' in props && props.nodeId) {
        ids.push(props.nodeId)
      }
    }
    return ids
  }

  getMultiClusters(
    features: Array<GeoJSON.Feature<GeoJSON.Point, ScProps>>,
  ): MapClusterGroup[] {
    const groups: MapClusterGroup[] = []
    for (const f of features) {
      const props = f.properties
      if (!('cluster' in props) || !props.cluster) {
        continue
      }
      if (props.point_count < CLUSTER_MIN_POINTS) {
        continue
      }
      const group = this.buildClusterGroup(
        f as GeoJSON.Feature<GeoJSON.Point, ClusterProps>,
      )
      if (group) {
        groups.push(group)
      }
    }
    return groups
  }

  findClusterAt(
    lng: number,
    lat: number,
    bbox: [number, number, number, number],
    zoom: number,
  ): MapClusterGroup | null {
    const features = this.getClustersInView(bbox, zoom)
    for (const f of features) {
      const props = f.properties
      if (!('cluster' in props) || !props.cluster) {
        continue
      }
      const group = this.buildClusterGroup(
        f as GeoJSON.Feature<GeoJSON.Point, ClusterProps>,
      )
      if (!group?.polygon) {
        continue
      }
      if (pointInRing(lng, lat, group.polygon.coordinates[0])) {
        return group
      }
    }
    return null
  }
}

function pointInRing(lng: number, lat: number, ring: GeoJSON.Position[]): boolean {
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
