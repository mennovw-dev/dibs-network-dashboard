/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TIER_A_MAX_LEAVES?: string
  readonly VITE_TIER_B_MAX_CARDS?: string
  readonly VITE_TIER_B_MAX_LEAVES?: string
  readonly VITE_AUTO_OPEN_CLUSTER_ZOOM?: string
  readonly VITE_CLUSTER_MIN_POINTS?: string
  readonly VITE_LOD_WORKER_MIN_NODES?: string
  readonly VITE_MAX_DOM_MARKERS?: string
  readonly VITE_LOADTEST_COUNT?: string
  readonly VITE_MAP_TILES_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
