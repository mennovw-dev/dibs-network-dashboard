import type { EnrichedNode } from './houses'
import { listingPriorityScore } from './listingSort'
import type { MapClusterGroup } from './mapClusterIndex'
import { CLUSTER_MIN_POINTS } from './mapClusterIndex'
import { MAP_CONFIG } from './mapConfig'

export const TIER_A_MAX_LEAVES = MAP_CONFIG.tierAMaxLeaves
export const TIER_B_MAX_CARDS = MAP_CONFIG.tierBMaxCards
export const TIER_B_MAX_LEAVES = MAP_CONFIG.tierBMaxLeaves
export const AUTO_OPEN_CLUSTER_ZOOM = MAP_CONFIG.autoOpenClusterZoom

export type MapLodTier = 'sparse' | 'medium' | 'dense' | 'cluster-open'

export interface ClusterSelection {
  id: string
  clusterId: number
  label: string
  nodes: EnrichedNode[]
  hull: [number, number][]
  polygon: GeoJSON.Polygon | null
}

export interface MapLodState {
  tier: MapLodTier
  cardIds: Set<string>
  pinOnlyIds: Set<string>
  clusterMemberIds: Set<string>
  clusters: MapClusterGroup[]
  activeCluster: ClusterSelection | null
}

export interface MapLodInput {
  leafIds: string[]
  multiClusters: MapClusterGroup[]
  nodeById: globalThis.Map<string, EnrichedNode>
  activeCluster: ClusterSelection | null
  hoveredId: string | null
  selectedId: string | null
  drawerHighlightId: string | null
  zoom: number
}

function clusterMemberSet(clusters: MapClusterGroup[]): Set<string> {
  const ids = new Set<string>()
  for (const c of clusters) {
    for (const id of c.nodeIds) {
      ids.add(id)
    }
  }
  return ids
}

export function computeMapLod(input: MapLodInput): MapLodState {
  const {
    leafIds,
    multiClusters,
    nodeById,
    activeCluster,
    hoveredId,
    selectedId,
    drawerHighlightId,
  } = input

  const clusterMemberIds = clusterMemberSet(multiClusters)
  const clusters = multiClusters

  if (activeCluster) {
    const memberIds = new Set(activeCluster.nodes.map((n) => n.id))
    const cardIds = new Set<string>()
    const pinOnlyIds = new Set(memberIds)
    return {
      tier: 'cluster-open',
      cardIds,
      pinOnlyIds,
      clusterMemberIds: memberIds,
      clusters,
      activeCluster,
    }
  }

  const looseLeaves = leafIds.filter((id) => !clusterMemberIds.has(id))
  const looseCount = looseLeaves.length
  const hasDenseClusters = clusters.length > 0

  let tier: MapLodTier = 'sparse'
  if (hasDenseClusters && looseCount > TIER_B_MAX_LEAVES) {
    tier = 'dense'
  } else if (hasDenseClusters || looseCount > TIER_A_MAX_LEAVES) {
    tier = looseCount <= TIER_B_MAX_LEAVES ? 'medium' : 'dense'
  } else if (looseCount > TIER_A_MAX_LEAVES) {
    tier = 'medium'
  }

  const cardIds = new Set<string>()
  const pinOnlyIds = new Set<string>(clusterMemberIds)

  const alwaysRich = new Set<string>()
  if (hoveredId) {
    alwaysRich.add(hoveredId)
  }
  if (selectedId) {
    alwaysRich.add(selectedId)
  }
  if (drawerHighlightId) {
    alwaysRich.add(drawerHighlightId)
  }

  const maxCards = MAP_CONFIG.maxVisibleCards

  if (tier === 'sparse') {
    const ranked = [...looseLeaves].sort((a, b) => {
      const nodeA = nodeById.get(a)
      const nodeB = nodeById.get(b)
      return listingPriorityScore(nodeB ?? ({ id: b } as EnrichedNode)) -
        listingPriorityScore(nodeA ?? ({ id: a } as EnrichedNode))
    })
    for (const id of ranked.slice(0, maxCards)) {
      cardIds.add(id)
    }
    for (const id of looseLeaves) {
      if (!cardIds.has(id)) {
        pinOnlyIds.add(id)
      }
    }
  } else if (tier === 'medium') {
    const ranked = [...looseLeaves].sort((a, b) => {
      const nodeA = nodeById.get(a)
      const nodeB = nodeById.get(b)
      return listingPriorityScore(nodeB ?? ({ id: b } as EnrichedNode)) -
        listingPriorityScore(nodeA ?? ({ id: a } as EnrichedNode))
    })
    const top = ranked.slice(0, TIER_B_MAX_CARDS)
    for (const id of top) {
      cardIds.add(id)
    }
    for (const id of looseLeaves) {
      if (!cardIds.has(id)) {
        pinOnlyIds.add(id)
      }
    }
  } else {
    for (const id of looseLeaves) {
      pinOnlyIds.add(id)
    }
  }

  for (const id of alwaysRich) {
    // Hover / select / drawer focus may show a card even inside a cluster badge area.
    if (tier === 'dense' || pinOnlyIds.has(id) || clusterMemberIds.has(id)) {
      cardIds.add(id)
    }
  }

  return {
    tier,
    cardIds,
    pinOnlyIds,
    clusterMemberIds,
    clusters,
    activeCluster: null,
  }
}

export function rankLeavesForCards(
  leaves: EnrichedNode[],
  limit: number,
): string[] {
  return [...leaves]
    .sort((a, b) => listingPriorityScore(b) - listingPriorityScore(a))
    .slice(0, limit)
    .map((n) => n.id)
}

export function clusterSelectionFromGroup(
  group: MapClusterGroup,
  label: string,
): ClusterSelection {
  return {
    id: group.id,
    clusterId: group.clusterId,
    label,
    nodes: group.nodes,
    hull: group.hull,
    polygon: group.polygon,
  }
}

export function shouldAutoOpenCluster(
  zoom: number,
  prevZoom: number,
  group: MapClusterGroup,
  mapCenter: LngLat,
): boolean {
  if (zoom < AUTO_OPEN_CLUSTER_ZOOM || zoom <= prevZoom) {
    return false
  }
  const [clng, clat] = group.center
  const [mlng, mlat] = mapCenter
  const dist = Math.hypot(clng - mlng, clat - mlat)
  return dist < 0.0045
}

type LngLat = [number, number]

export { CLUSTER_MIN_POINTS }
