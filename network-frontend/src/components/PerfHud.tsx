import type { MapLodTier } from '../lib/mapLod'

export interface PerfSnapshot {
  tier: MapLodTier
  nodeCount: number
  domMarkers: number
  lodMs: number
  worker: boolean
}

interface PerfHudProps {
  snapshot: PerfSnapshot | null
}

export function PerfHud({ snapshot }: PerfHudProps) {
  if (!snapshot) {
    return null
  }

  return (
    <div className="perf-hud" aria-live="polite">
      <span>tier {snapshot.tier}</span>
      <span>{snapshot.nodeCount} nodes</span>
      <span>{snapshot.domMarkers} dom</span>
      <span>{snapshot.lodMs.toFixed(1)}ms</span>
      <span>{snapshot.worker ? 'worker' : 'main'}</span>
    </div>
  )
}

export function perfModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return new URLSearchParams(window.location.search).has('perf')
}
