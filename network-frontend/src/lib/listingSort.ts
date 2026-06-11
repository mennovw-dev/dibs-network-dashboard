import type { EnrichedNode } from './houses'

const STATUS_RANK: Record<string, number> = {
  active: 0,
  paused: 1,
  closed: 2,
  draft: 3,
}

/** Higher = more important for card visibility and drawer order. */
export function listingPriorityScore(node: EnrichedNode): number {
  let score = 0
  const statusRank = STATUS_RANK[node.status] ?? 4
  score += (4 - statusRank) * 1000

  if (node.reactions_max > 0) {
    score += (node.reactions_count / node.reactions_max) * 400
  }

  if (node.listed_at) {
    const ageDays = (Date.now() - new Date(node.listed_at).getTime()) / 86_400_000
    score += Math.max(0, 120 - ageDays * 2)
  }

  return score
}

/** Drawer / cluster list ordering: status → recency → reaction pressure. */
export function sortDrawerListings(nodes: EnrichedNode[]): EnrichedNode[] {
  return [...nodes].sort((a, b) => {
    const sa = STATUS_RANK[a.status] ?? 4
    const sb = STATUS_RANK[b.status] ?? 4
    if (sa !== sb) {
      return sa - sb
    }

    const ta = a.listed_at ? new Date(a.listed_at).getTime() : 0
    const tb = b.listed_at ? new Date(b.listed_at).getTime() : 0
    if (ta !== tb) {
      return tb - ta
    }

    const ra =
      a.reactions_max > 0 ? a.reactions_count / a.reactions_max : 0
    const rb =
      b.reactions_max > 0 ? b.reactions_count / b.reactions_max : 0
    return rb - ra
  })
}
