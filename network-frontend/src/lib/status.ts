import type { ListingNode, ListingStatus } from '../types'

export const STATUS_COLORS: Record<string, string> = {
  active: 'var(--teal)',
  paused: 'var(--gold-bright)',
  closed: 'var(--dim)',
  draft: 'var(--fg2)',
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Open',
  paused: 'Gepauzeerd',
  closed: 'Gesloten',
  draft: 'Concept',
}

export const MAP_STATUS_COLORS: Record<string, string> = {
  active: '#5e938e',
  paused: '#e2c685',
  closed: '#605848',
  draft: '#a09888',
}

export function statusTag(node: ListingNode): string {
  if (node.status === 'active' && node.reactions_max > 0) {
    return `${node.reactions_count} / ${node.reactions_max} reacties`
  }
  return STATUS_LABELS[node.status] ?? node.status
}

export function panelBorderColor(status: ListingStatus | string): string {
  switch (status) {
    case 'active':
      return 'var(--teal)'
    case 'paused':
      return 'var(--gold-bright)'
    case 'closed':
      return 'var(--dim)'
    default:
      return 'var(--gold)'
  }
}
