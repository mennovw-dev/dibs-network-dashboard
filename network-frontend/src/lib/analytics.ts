import type { ListingNode } from '../types'

// Synthetic-but-stable per-listing analytics. Seeded by node id so the numbers
// stay consistent across renders. STAGING ONLY — replace with real funnel data
// from the backend once those events exist.

export interface TimelinePoint {
  t: number // ms timestamp
  cumulative: number // cumulative reactions at t
}

export interface ListingAnalytics {
  inception: number // ms timestamp the listing opened
  daysOpen: number
  views: number // renters who opened the listing
  clickedReact: number // viewers who pressed "Reageren"
  clickedAway: number // viewers who left without reacting
  notForMe: number // viewers who pressed "Niet voor mij"
  reactRate: number // clickedReact / views (0..1)
  reactionsTimeline: TimelinePoint[]
  housematesTotal: number
  housematesOnDibs: number
  preSwiped: number // candidates housemates pre-emptively swiped
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const cache = new Map<string, ListingAnalytics>()

export function getAnalytics(node: ListingNode): ListingAnalytics {
  const cached = cache.get(node.id)
  if (cached) {
    return cached
  }

  const rng = mulberry32(hashStr(node.id))
  const rand = (a: number, b: number) => a + (b - a) * rng()
  const randint = (a: number, b: number) => Math.floor(rand(a, b + 1))

  const now = Date.now()
  const reactions = Math.max(0, node.reactions_count ?? 0)

  const listedMs = node.listed_at ? new Date(node.listed_at).getTime() : NaN
  const daysOpen = Number.isFinite(listedMs)
    ? clamp(Math.round((now - listedMs) / 86_400_000), 1, 120)
    : randint(5, 35)
  const inception = now - daysOpen * 86_400_000

  // Views are a multiple of reactions (most viewers don't react).
  const views = Math.max(
    reactions + randint(4, 14),
    Math.round(reactions * rand(4, 9)) + randint(6, 40),
  )
  const reactRate = views > 0 ? reactions / views : 0
  const notForMe = Math.round(Math.max(0, views - reactions) * rand(0.15, 0.4))
  const clickedReact = reactions
  const clickedAway = Math.max(0, views - reactions - notForMe)

  const housematesTotal = randint(3, 6)
  const housematesOnDibs = randint(1, housematesTotal)
  const preSwiped = randint(0, 28)

  // Front-loaded cumulative reactions curve from inception → now.
  const steps = clamp(daysOpen, 5, 16)
  const reactionsTimeline: TimelinePoint[] = []
  for (let i = 0; i <= steps; i += 1) {
    const frac = i / steps
    const cumulative = Math.round(reactions * (1 - Math.pow(1 - frac, 1.8)))
    reactionsTimeline.push({ t: inception + frac * daysOpen * 86_400_000, cumulative })
  }

  const result: ListingAnalytics = {
    inception,
    daysOpen,
    views,
    clickedReact,
    clickedAway,
    notForMe,
    reactRate,
    reactionsTimeline,
    housematesTotal,
    housematesOnDibs,
    preSwiped,
  }
  cache.set(node.id, result)
  return result
}
