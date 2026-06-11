import { CITIES, type City } from '../lib/cities'
import type { ListingNode } from '../types'
import { useT } from '../i18n'

interface CityOverviewProps {
  city: City | null
  nodes: ListingNode[]
  onSelect: (city: City) => void
}

function cityNodeCount(nodes: ListingNode[], cityName: string): number {
  const target = cityName.toLowerCase()
  return nodes.filter((n) => (n.city ?? '').toLowerCase() === target).length
}

export function CityOverview({ city, nodes, onSelect }: CityOverviewProps) {
  const t = useT()

  return (
    <section className="city-overview" aria-label={t('cityoverview.title')}>
      <header className="city-overview__head">
        <span className="city-overview__title">{t('cityoverview.title')}</span>
      </header>
      <ul className="city-overview__list">
        {CITIES.map((c) => {
          const count = cityNodeCount(nodes, c.name)
          const active = c.id === city?.id
          return (
            <li key={c.id}>
              <button
                type="button"
                className={`city-card ${active ? 'is-active' : ''}`}
                onClick={() => onSelect(c)}
                aria-current={active}
              >
                <span className="city-card__dot" aria-hidden="true" />
                <span className="city-card__body">
                  <span className="city-card__name">{c.name}</span>
                  <span className="city-card__meta">
                    {count} {count === 1 ? t('panel.listing') : t('panel.listings')}
                  </span>
                </span>
                <span className="city-card__go" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
