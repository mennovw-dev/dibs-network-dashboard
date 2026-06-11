import { useEffect, type RefObject } from 'react'
import type { EnrichedNode } from '../lib/houses'
import { statusLabel } from '../lib/status'
import { useT } from '../i18n'

interface ListingEntryListProps {
  nodes: EnrichedNode[]
  lang: string
  highlightId?: string | null
  selectedId?: string | null
  onHighlight?: (id: string | null) => void
  onPick: (node: EnrichedNode) => void
  layout?: 'vertical' | 'horizontal'
  itemRef?: (id: string, el: HTMLLIElement | null) => void
}

export function ListingEntryList({
  nodes,
  lang,
  highlightId,
  selectedId,
  onHighlight,
  onPick,
  layout = 'vertical',
  itemRef,
}: ListingEntryListProps) {
  const t = useT()
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  const listClass =
    layout === 'horizontal' ? 'listing-entry-list listing-entry-list--row' : 'listing-entry-list'

  return (
    <ul className={listClass}>
      {nodes.map((node) => {
        const isHot = highlightId === node.id || selectedId === node.id
        return (
          <li
            key={node.id}
            ref={(el) => itemRef?.(node.id, el)}
            className={isHot ? 'is-hot' : undefined}
          >
            <button
              type="button"
              className="street-entry"
              onClick={() => onPick(node)}
              onMouseEnter={() => onHighlight?.(node.id)}
              onMouseLeave={() => onHighlight?.(null)}
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
          </li>
        )
      })}
    </ul>
  )
}

/** Scroll the drawer list when a map pin is hovered. */
export function useScrollToHighlight(
  highlightId: string | null | undefined,
  itemRefs: RefObject<globalThis.Map<string, HTMLLIElement>>,
) {
  useEffect(() => {
    if (!highlightId) {
      return
    }
    const el = itemRefs.current?.get(highlightId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [highlightId, itemRefs])
}
