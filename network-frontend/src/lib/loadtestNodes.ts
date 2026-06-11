import type { ListingNode } from '../types'

const UTRECHT_CENTER = { lng: 5.1214, lat: 52.0907 }

const HOODS = [
  { name: 'Wittevrouwen', lng: 5.128, lat: 52.095, spread: 0.012 },
  { name: 'Lombok', lng: 5.108, lat: 52.088, spread: 0.014 },
  { name: 'Tuinwijk', lng: 5.115, lat: 52.102, spread: 0.01 },
  { name: 'Zuilen', lng: 5.088, lat: 52.108, spread: 0.016 },
  { name: 'Oudwijk', lng: 5.132, lat: 52.085, spread: 0.011 },
]

const STATUSES = ['active', 'active', 'active', 'paused', 'closed'] as const

/** Deterministic pseudo-random from seed string. */
function hash01(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

export function generateLoadtestNodes(count: number, prefix = 'load'): ListingNode[] {
  const nodes: ListingNode[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const hood = HOODS[i % HOODS.length]
    const r1 = hash01(`${prefix}-${i}-a`)
    const r2 = hash01(`${prefix}-${i}-b`)
    const lng = hood.lng + (r1 - 0.5) * hood.spread
    const lat = hood.lat + (r2 - 0.5) * hood.spread
    const status = STATUSES[i % STATUSES.length]
    const max = 24
    const reactions = Math.floor(hash01(`${prefix}-${i}-c`) * max)

    nodes.push({
      id: `${prefix}-${i}`,
      house_id: `${prefix}-house-${i}`,
      name: `Loadtest ${hood.name} ${i + 1}`,
      city: 'Utrecht',
      status,
      latitude: lat,
      longitude: lng,
      reactions_count: reactions,
      reactions_max: max,
      listed_at: new Date(now - i * 86_400_000).toISOString(),
      has_coordinates: true,
      street: `Teststraat ${(i % 90) + 1}`,
      neighborhood: hood.name,
    })
  }

  return nodes
}

export function loadtestCountFromUrl(): number {
  if (typeof window === 'undefined') {
    return 0
  }
  const raw = new URLSearchParams(window.location.search).get('loadtest')
  if (!raw) {
    return 0
  }
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export function mergeWithLoadtest(base: ListingNode[], extraCount: number): ListingNode[] {
  if (extraCount <= 0) {
    return base
  }
  return [...base, ...generateLoadtestNodes(extraCount)]
}

export { UTRECHT_CENTER }
