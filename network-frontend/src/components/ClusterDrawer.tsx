import { useRef } from 'react'
import type { ClusterSelection } from '../lib/mapLod'
import { ListingEntryList, useScrollToHighlight } from './ListingEntryList'
import { useT } from '../i18n'

interface ClusterDrawerProps {
  cluster: ClusterSelection | null
  lang: string
  selectedId: string | null
  highlightId: string | null
  onHighlight: (id: string | null) => void
  onPick: (id: string) => void
  onClose: () => void
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
  const itemRefs = useRef(new globalThis.Map<string, HTMLLIElement>())

  useScrollToHighlight(highlightId ?? selectedId, itemRefs)

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

      <div className="cluster-drawer__scroll">
        <ListingEntryList
          nodes={cluster.nodes}
          lang={lang}
          layout="horizontal"
          highlightId={highlightId}
          selectedId={selectedId}
          onHighlight={onHighlight}
          onPick={(node) => onPick(node.id)}
          itemRef={(id, el) => {
            if (el) {
              itemRefs.current.set(id, el)
            } else {
              itemRefs.current.delete(id)
            }
          }}
        />
      </div>
    </aside>
  )
}
