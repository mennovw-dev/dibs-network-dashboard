import type { GeoLocation } from '../lib/geocode'
import { useT } from '../i18n'

interface LocationReadoutProps {
  location: GeoLocation | null
  active: boolean
}

export function LocationReadout({ location, active }: LocationReadoutProps) {
  const t = useT()

  if (!active || !location || !location.street) {
    return (
      <div className="location-readout location-readout--empty">
        <span className="location-readout__kick">{t('location.street')}</span>
        <span className="location-readout__hint">{t('cursor.hint')}</span>
      </div>
    )
  }

  return (
    <div className="location-readout">
      <span className="location-readout__kick">{t('location.street')}</span>
      <span className="location-readout__street">{location.street}</span>
    </div>
  )
}
