/** Tunable map / LOD thresholds — override via Vite env or URL ?loadtest=N */
function envInt(key: string, fallback: number): number {
  const raw = import.meta.env?.[key]
  if (raw === undefined || raw === '') {
    return fallback
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export const MAP_CONFIG = {
  /** Max listing cards on map at once (excl. hover / select). */
  maxVisibleCards: envInt('VITE_MAX_VISIBLE_CARDS', 3),
  tierAMaxLeaves: envInt('VITE_TIER_A_MAX_LEAVES', 3),
  tierBMaxCards: envInt('VITE_TIER_B_MAX_CARDS', 2),
  tierBMaxLeaves: envInt('VITE_TIER_B_MAX_LEAVES', 12),
  autoOpenClusterZoom: envInt('VITE_AUTO_OPEN_CLUSTER_ZOOM', 15.25) || 15.25,
  clusterMinPoints: envInt('VITE_CLUSTER_MIN_POINTS', 3),
  neighborhoodClusterMin: envInt('VITE_NEIGHBORHOOD_CLUSTER_MIN', 2),
  /** Run LOD + Supercluster in a Web Worker from this node count upward. */
  lodWorkerMinNodes: envInt('VITE_LOD_WORKER_MIN_NODES', 500),
  /** Max React DOM markers (cards) on the map at once. */
  maxDomMarkers: envInt('VITE_MAX_DOM_MARKERS', 20),
  /** Synthetic nodes merged in dev when ?loadtest=N or VITE_LOADTEST_COUNT is set. */
  loadtestCount: envInt('VITE_LOADTEST_COUNT', 0),
} as const

export type MapConfig = typeof MAP_CONFIG
