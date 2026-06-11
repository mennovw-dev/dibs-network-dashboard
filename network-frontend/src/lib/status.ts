import type { ListingNode, ListingStatus } from '../types'
import type { TFn } from '../i18n'

export const STATUS_COLORS: Record<string, string> = {
  active: 'var(--green)',
  paused: 'var(--gold)',
  closed: 'var(--grey-closed)',
  draft: 'var(--dim)',
}

export const STATUS_LABEL_KEYS: Record<string, string> = {
  active: 'status.active',
  paused: 'status.paused',
  closed: 'status.closed',
  draft: 'status.draft',
}

export const MAP_STATUS_COLORS: Record<string, string> = {
  active: '#3ddc84',
  paused: '#ffc861',
  closed: '#4a4560',
  draft: '#6f6790',
}

export function statusLabel(status: ListingStatus | string, t: TFn): string {
  const key = STATUS_LABEL_KEYS[status]
  return key ? t(key) : status
}

export function statusTag(node: ListingNode, t: TFn): string {
  if (node.status === 'active' && node.reactions_max > 0) {
    return `${node.reactions_count} / ${node.reactions_max} ${t('panel.reactions')}`
  }
  return statusLabel(node.status, t)
}

export function panelBorderColor(status: ListingStatus | string): string {
  switch (status) {
    case 'active':
      return 'var(--green)'
    case 'paused':
      return 'var(--gold)'
    case 'closed':
      return 'var(--grey-closed)'
    default:
      return 'var(--violet)'
  }
}
