import type { ListingNode } from '../types'
import { panelBorderColor, statusTag } from '../lib/status'

interface ListingPanelProps {
  node: ListingNode | null
  onClose: () => void
}

export function ListingPanel({ node, onClose }: ListingPanelProps) {
  if (!node) {
    return null
  }

  return (
    <aside
      className="listing-panel"
      style={{ borderColor: panelBorderColor(node.status) }}
      data-status={node.status}
    >
      <div className="listing-panel__top">
        <span className="listing-panel__city">{node.city || '—'}</span>
        <button type="button" className="listing-panel__close" onClick={onClose} aria-label="Sluiten">
          ×
        </button>
      </div>
      <span className="listing-panel__tag">{statusTag(node)}</span>
      <p className="listing-panel__name">{node.name || 'Naamloos'}</p>
      <p className="listing-panel__meta">
        Status <span>{node.status}</span>
        {node.has_coordinates && (
          <>
            {' · '}
            {node.latitude?.toFixed(4)}, {node.longitude?.toFixed(4)}
          </>
        )}
      </p>
      <p className="listing-panel__desc">
        Listing in het staging-netwerk.{' '}
        <span className="hl">
          {node.reactions_count} reactie{node.reactions_count === 1 ? '' : 's'}
        </span>{' '}
        geregistreerd.
      </p>
      <div className="listing-panel__chips">
        <span className="chip chip--verified">STAGING</span>
        <span className="chip">ID {node.id.slice(0, 8)}…</span>
      </div>
    </aside>
  )
}
