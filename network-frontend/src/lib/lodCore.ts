import type { CompactNode } from './compactNode'
import { compactToEnriched } from './compactNode'
import { MAP_CONFIG, type MapConfig } from './mapConfig'
import { MapClusterIndex, type MapClusterGroup } from './mapClusterIndex'
import {
  computeMapLod,
  shouldAutoOpenCluster,
  type ClusterSelection,
  type MapLodTier,
} from './mapLod'

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

  return ordered.slice(0, max)
}

/** Pure LOD pipeline — safe to run on main thread or in a worker. */
export function runLodEngine(input: LodEngineInput): LodEngineResult {
  const t0 = performance.now()
  const config = input.config ?? MAP_CONFIG

  const enriched = input.compactNodes.map(compactToEnriched)
  const index = new MapClusterIndex()
  index.load(enriched)

  const features = index.getClustersInView(input.bbox, input.zoom)
  const leafIds = index.getLeafNodeIds(features)
  const multiClusters = index.getMultiClusters(features)
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

  let autoOpenGroup: MapClusterGroup | null = null
  if (!input.activeCluster && multiClusters.length > 0) {
    for (const group of multiClusters) {
      if (
        shouldAutoOpenCluster(input.zoom, input.prevZoom, group, input.mapCenter)
      ) {
        autoOpenGroup = group
        break
      }
    }
  }

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
    autoOpenGroup,
    elapsedMs: performance.now() - t0,
  }
}
