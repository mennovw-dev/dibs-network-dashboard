import type { EnrichedNode } from '../lib/houses'
import { statusLabel } from '../lib/status'
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

  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  const title = selection.street || selection.neighborhood || t('street.unknown')
  // Newest first → reads like a timeline of the street's activity.
  const entries = [...selection.matches].sort(
    (a, b) => new Date(b.listed_at).getTime() - new Date(a.listed_at).getTime(),
  )

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
        <ul className="street-panel__list">
          {entries.map((node) => (
            <li key={node.id}>
              <button type="button" className="street-entry" onClick={() => onPick(node)}>
                <span
                  className="street-entry__photo"
                  style={{ backgroundImage: `url("${node.photo}")` }}
                  aria-hidden="true"
                />
                <span className="street-entry__body">
                  <span className="street-entry__name">{node.name || t('panel.unnamed')}</span>
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
          ))}
        </ul>
      )}
    </aside>
  )
}
