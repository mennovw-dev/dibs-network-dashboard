import { useT } from '../i18n'
import type { EnrichedNode } from '../lib/houses'

export type StatusFilter = 'all' | 'active' | 'paused' | 'closed'

const TABS: { id: StatusFilter; labelKey: string }[] = [
  { id: 'all', labelKey: 'tabs.all' },
  { id: 'active', labelKey: 'status.active' },
  { id: 'paused', labelKey: 'status.paused' },
  { id: 'closed', labelKey: 'status.closed' },
]

function inFilter(node: EnrichedNode, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'closed') return node.status === 'closed' || node.status === 'draft'
  return node.status === filter
}

export function matchesStatusFilter(node: EnrichedNode, filter: StatusFilter): boolean {
  return inFilter(node, filter)
}

interface StatusTabsProps {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
  nodes: EnrichedNode[]
}

export function StatusTabs({ value, onChange, nodes }: StatusTabsProps) {
  const t = useT()
  return (
    <nav className="status-tabs" aria-label="Status filter">
      {TABS.map((tab) => {
        const count = nodes.filter((n) => inFilter(n, tab.id)).length
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            className={`status-tab status-tab--${tab.id} ${active ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
            aria-pressed={active}
          >
            <span className="status-tab__label">{t(tab.labelKey)}</span>
            <span className="status-tab__count">{count}</span>
          </button>
        )
      })}
    </nav>
  )
}
