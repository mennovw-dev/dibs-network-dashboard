import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ClusterSelection } from '../lib/mapLod'
import type { EnrichedNode } from '../lib/houses'
import { statusLabel } from '../lib/status'
import { useT } from '../i18n'

const ROW_WIDTH = 228

interface ClusterDrawerProps {
  cluster: ClusterSelection | null
  lang: string
  selectedId: string | null
  highlightId: string | null
  onHighlight: (id: string | null) => void
  onPick: (id: string) => void
  onClose: () => void
}

function ClusterDrawerRow({
  node,
  lang,
  onHighlight,
  onPick,
}: {
  node: EnrichedNode
  lang: string
  onHighlight: (id: string | null) => void
  onPick: (id: string) => void
}) {
  const t = useT()
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'

  return (
    <button
      type="button"
      className="street-entry"
      onClick={() => onPick(node.id)}
      onMouseEnter={() => onHighlight(node.id)}
      onMouseLeave={() => onHighlight(null)}
      style={{ width: ROW_WIDTH }}
    >
      <span
        className="street-entry__photo"
        style={{ backgroundImage: `url("${node.photo}")` }}
        aria-hidden="true"
      />
      <span className="street-entry__body">
        <span className="street-entry__name">{node.name || t('panel.unnamed')}</span>
        <span className="street-entry__addr">{node.street || node.city || '—'}</span>
        <span className="street-entry__meta">
          <span className={`street-entry__status street-entry__status--${node.status}`}>
            {statusLabel(node.status, t)}
          </span>
          {node.listed_at && (
            <span className="street-entry__date">
              {new Date(node.listed_at).toLocaleDateString(locale, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

export function ClusterDrawer({
  cluster,
  lang,
  selectedId,
  highlightId,
  onHighlight,
  onPick,
  onClose,
}: ClusterDrawerProps) {
  const t = useT()
  const scrollRef = useRef<HTMLDivElement>(null)

  const nodes = cluster?.nodes ?? []
  const virtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_WIDTH,
    horizontal: true,
    overscan: 4,
  })

  const focusId = highlightId ?? selectedId
  useEffect(() => {
    if (!focusId || !cluster) {
      return
    }
    const index = cluster.nodes.findIndex((n) => n.id === focusId)
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: 'auto', behavior: 'smooth' })
    }
  }, [focusId, cluster, virtualizer])

  if (!cluster) {
    return null
  }

  const count = cluster.nodes.length

  return (
    <aside className="cluster-drawer" role="dialog" aria-label={cluster.label}>
      <div className="cluster-drawer__head">
        <div>
          <span className="cluster-drawer__kick">{t('cluster.title')}</span>
          <span className="cluster-drawer__name">{cluster.label}</span>
          <span className="cluster-drawer__count">
            {count} {count === 1 ? t('panel.listing') : t('panel.listings')}
          </span>
        </div>
        <button
          type="button"
          className="cluster-drawer__close"
          onClick={onClose}
          aria-label={t('panel.close')}
        >
          ×
        </button>
      </div>

      <div ref={scrollRef} className="cluster-drawer__scroll cluster-drawer__scroll--virtual">
        <div
          className="cluster-drawer__track"
          style={{ width: virtualizer.getTotalSize(), height: '100%' }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const node = nodes[item.index]
            const isHot = highlightId === node.id || selectedId === node.id
            return (
              <div
                key={node.id}
                className={isHot ? 'cluster-drawer__cell is-hot' : 'cluster-drawer__cell'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateX(${item.start}px)`,
                  width: item.size,
                  height: '100%',
                }}
                ref={virtualizer.measureElement}
                data-index={item.index}
              >
                <ClusterDrawerRow
                  node={node}
                  lang={lang}
                  onHighlight={onHighlight}
                  onPick={onPick}
                />
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
