import type { CompactNode } from './compactNode'
import { compactToEnriched } from './compactNode'
import { MAP_CONFIG, type MapConfig } from './mapConfig'
import { MapClusterIndex, type MapClusterGroup } from './mapClusterIndex'
import { getNeighborhoodClusters, mergeClusterGroups } from './neighborhoodClusters'
import { computeMapLod, type ClusterSelection, type MapLodTier } from './mapLod'

export interface LodEngineInput {
  compactNodes: CompactNode[]
  bbox: [number, number, number, number]
  zoom: number
  prevZoom: number
  mapCenter: [number, number]
  hoveredId: string | null
  selectedId: string | null
  drawerHighlightId: string | null
  activeCluster: ClusterSelection | null
  config?: MapConfig
}

export interface LodEngineResult {
  tier: MapLodTier
  cardIds: string[]
  pinOnlyIds: string[]
  clusterMemberIds: string[]
  domMarkerIds: string[]
  multiClusters: MapClusterGroup[]
  autoOpenGroup: MapClusterGroup | null
  elapsedMs: number
}

function pickDomMarkerIds(
  cardIds: Set<string>,
  hoveredId: string | null,
  selectedId: string | null,
  drawerHighlightId: string | null,
  max: number,
): string[] {
  const ordered: string[] = []
  const seen = new Set<string>()
  const push = (id: string | null) => {
    if (!id || seen.has(id)) {
      return
    }
    seen.add(id)
    ordered.push(id)
  }

  push(selectedId)
  push(hoveredId)
  push(drawerHighlightId)
  for (const id of cardIds) {
    push(id)
  }

  return ordered.slice(0, Math.min(max, 8))
}

/** Pure LOD pipeline — safe to run on main thread or in a worker. */
export function runLodEngine(input: LodEngineInput): LodEngineResult {
  const t0 = performance.now()
  const config = input.config ?? MAP_CONFIG

  const enriched = input.compactNodes.map(compactToEnriched)
  const index = new MapClusterIndex()
  index.load(enriched)

  const features = index.getClustersInView(input.bbox, input.zoom)
  const hoodClusters = getNeighborhoodClusters(
    enriched,
    input.bbox,
    config.neighborhoodClusterMin,
  )
  const scClusters = index.getMultiClusters(features)
  const multiClusters = mergeClusterGroups(hoodClusters, scClusters)

  const clusteredIds = new Set(multiClusters.flatMap((g) => g.nodeIds))
  const leafIds = enriched
    .filter((n) => !clusteredIds.has(n.id))
    .map((n) => n.id)
  const nodeById = new globalThis.Map(enriched.map((n) => [n.id, n]))

  const lod = computeMapLod({
    leafIds,
    multiClusters,
    nodeById,
    activeCluster: input.activeCluster,
    hoveredId: input.hoveredId,
    selectedId: input.selectedId,
    drawerHighlightId: input.drawerHighlightId,
    zoom: input.zoom,
  })

  const domMarkerIds = pickDomMarkerIds(
    lod.cardIds,
    input.hoveredId,
    input.selectedId,
    input.drawerHighlightId,
    config.maxDomMarkers,
  )

  return {
    tier: lod.tier,
    cardIds: [...lod.cardIds],
    pinOnlyIds: [...lod.pinOnlyIds],
    clusterMemberIds: [...lod.clusterMemberIds],
    domMarkerIds,
    multiClusters,
    autoOpenGroup: null,
    elapsedMs: performance.now() - t0,
  }
}
