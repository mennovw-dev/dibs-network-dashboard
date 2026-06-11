import type { EnrichedNode } from '../lib/houses'
import { ListingEntryList } from './ListingEntryList'
import { sortDrawerListings } from '../lib/listingSort'
import { useT } from '../i18n'

export interface StreetSelection {
  street: string | null
  neighborhood: string | null
  matches: EnrichedNode[]
}

interface StreetPanelProps {
  selection: StreetSelection | null
  onClose: () => void
  onPick: (node: EnrichedNode) => void
  lang: string
}

export function StreetPanel({ selection, onClose, onPick, lang }: StreetPanelProps) {
  const t = useT()
  if (!selection) {
    return null
  }

  const title = selection.street || selection.neighborhood || t('street.unknown')
  const entries = sortDrawerListings(selection.matches)

  return (
    <aside className="street-panel">
      <div className="street-panel__head">
        <div>
          <span className="street-panel__kick">{t('street.title')}</span>
          <span className="street-panel__name">{title}</span>
          {selection.neighborhood && selection.street && (
            <span className="street-panel__wijk">{selection.neighborhood}</span>
          )}
        </div>
        <button
          type="button"
          className="street-panel__close"
          onClick={onClose}
          aria-label={t('panel.close')}
        >
          ×
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="street-panel__empty">{t('street.empty')}</p>
      ) : (
        <ListingEntryList nodes={entries} lang={lang} onPick={onPick} layout="vertical" />
      )}
    </aside>
  )
}
