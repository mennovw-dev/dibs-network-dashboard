import type { GeoLocation } from '../lib/geocode'
import { useT } from '../i18n'

interface LocationReadoutProps {
  location: GeoLocation | null
  active: boolean
}

export function LocationReadout({ location, active }: LocationReadoutProps) {
  const t = useT()

  if (!active || !location) {
    return (
      <div className="location-readout location-readout--empty">
        <span className="location-readout__dot" aria-hidden="true" />
        {t('cursor.hint')}
      </div>
    )
  }

  const line2 = [location.postcode, location.city].filter(Boolean).join(' · ')

  return (
    <div className="location-readout">
      <span className="location-readout__dot" aria-hidden="true" />
      <div className="location-readout__lines">
        <span className="location-readout__city">
          {location.neighborhood || location.city || '—'}
        </span>
        <span className="location-readout__line">
          {location.street || `${t('location.street')} · ${t('location.pending')}`}
        </span>
        {line2 && <span className="location-readout__line">{line2}</span>}
      </div>
    </div>
  )
}
