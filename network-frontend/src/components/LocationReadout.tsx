import type { ListingNode } from '../types'
import { useT } from '../i18n'

interface LocationReadoutProps {
  node: ListingNode | null
}

export function LocationReadout({ node }: LocationReadoutProps) {
  const t = useT()

  if (!node) {
    return (
      <div className="location-readout location-readout--empty">
        <span className="location-readout__dot" aria-hidden="true" />
        {t('location.empty')}
      </div>
    )
  }

  const pending = t('location.pending')

  return (
    <div className="location-readout">
      <span className="location-readout__dot" aria-hidden="true" />
      <div className="location-readout__lines">
        <span className="location-readout__city">{node.city || '—'}</span>
        <span className="location-readout__line">
          {node.street || `${t('location.street')} · ${pending}`}
        </span>
        <span className="location-readout__line">
          {[node.postcode, node.neighborhood]
            .filter(Boolean)
            .join(' · ') || `${t('location.postcode')} · ${pending}`}
        </span>
      </div>
    </div>
  )
}
