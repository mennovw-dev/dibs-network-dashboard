import { useEffect, useState } from 'react'
import type { EnrichedNode } from '../lib/houses'
import { panelBorderColor, statusTag } from '../lib/status'
import { useT } from '../i18n'

interface ListingPanelProps {
  node: EnrichedNode | null
  onClose: () => void
}

export function ListingPanel({ node, onClose }: ListingPanelProps) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [node?.id])

  if (!node) {
    return null
  }

  const borderColor = panelBorderColor(node.status)
  const postcodeLine = [node.postcode, node.street].filter(Boolean).join(' · ')
  const description = node.bio
  const snippet = description.length > 64 ? `${description.slice(0, 64).trimEnd()}…` : description

  return (
    <aside className="listing-panel" style={{ borderColor }} data-status={node.status}>
      <div className="listing-panel__head">
        <div className="listing-panel__loc">
          <span className="listing-panel__city">
            {t('location.city')} <b>{(node.city || '—').toUpperCase()}</b>
          </span>
          <span className="listing-panel__postcode">
            {postcodeLine || `${t('location.postcode')} · ${t('location.pending')}`}
          </span>
        </div>
        <span className="state-tag" style={{ color: borderColor, borderColor }}>
          {statusTag(node, t)}
        </span>
        <button
          type="button"
          className="listing-panel__close"
          onClick={onClose}
          aria-label={t('panel.close')}
        >
          ×
        </button>
      </div>

      {node.neighborhood && (
        <p className="listing-panel__district">
          {t('location.district')} · <b>{node.neighborhood}</b>
        </p>
      )}

      <p className="listing-panel__name">{node.name || t('panel.unnamed')}</p>

      <button
        type="button"
        className={`listing-panel__desc ${expanded ? 'is-expanded' : ''}`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? description : snippet}
      </button>

      <div
        className="listing-panel__photo"
        style={{ backgroundImage: `url("${node.photo}")` }}
      >
        <span className="listing-panel__photo-tag">{t('panel.staging')}</span>
      </div>

      <div className="listing-panel__chips">
        <span className="chip chip--verified">✓ {t('panel.verified')}</span>
        <span className="chip chip--insta">◎ @dibshuis</span>
        <span className="chip">ID {node.id.slice(0, 8)}…</span>
      </div>

      <button type="button" className="listing-panel__more">
        {t('panel.seemore')}
      </button>
    </aside>
  )
}
