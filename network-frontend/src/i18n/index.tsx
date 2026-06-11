import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Lang = 'nl' | 'en'

type Dict = Record<string, string>

const STORAGE_KEY = 'dibs.lang'

const nl: Dict = {
  'brand.view': 'Network view',
  'topbar.staging': 'Staging',
  'topbar.city': 'Stad',
  'metric.nodes': 'Nodes',
  'metric.plotted': 'Op kaart',
  'metric.source': 'Bron',
  'metric.update': 'Update',
  'status.loading': 'Laden…',
  'view.settings': 'Weergave',
  'view.3d': '3D-gebouwen',
  'view.3d.hint': 'OpenStreetMap-extrusies',
  'view.time': 'Bekijk in de tijd',
  'view.time.hint': 'Tijdlijn van listings',
  'view.time.7d': '7 dagen',
  'view.time.30d': '30 dagen',
  'view.time.90d': '90 dagen',
  'legend.3d': '3D tiles · in te schakelen',
  'cursor.hint': 'Beweeg over de kaart',
  'street.title': 'Straat',
  'street.unknown': 'Onbekende locatie',
  'street.empty': 'Geen listings op deze straat (nog).',
  'timeline.play': 'Afspelen',
  'timeline.now': 'Nu · live',
  'timeline.tonow': 'Naar nu',
  'panel.close': 'Sluiten',
  'panel.unnamed': 'Naamloos',
  'panel.status': 'Status',
  'panel.reactions': 'reacties',
  'panel.reaction': 'reactie',
  'panel.registered': 'geregistreerd in het staging-netwerk.',
  'panel.staging': 'STAGING',
  'panel.listing': 'listing',
  'panel.listings': 'listings',
  'panel.seemore': 'Zie meer',
  'panel.verified': 'Geverifieerd',
  'panel.analytics': 'Activiteit',
  'panel.openSince': 'Open · {days}d',
  'panel.reactionsOverTime': 'Reacties over tijd',
  'panel.views': 'Bekeken',
  'panel.reactRate': 'Reactie-ratio',
  'panel.notForMe': 'Niet voor mij',
  'panel.housemates': 'Huisgenoten op Dibs',
  'panel.preSwiped': 'Vooraf geswipet',
  'marker.placedAgo': 'geplaatst {days}d geleden',
  'marker.views': '{n} bekeken',
  'cityoverview.title': 'City overview',
  'location.empty': 'Geen locatie geselecteerd',
  'location.city': 'Stad',
  'location.postcode': 'Postcode',
  'location.street': 'Straat',
  'location.district': 'Wijk',
  'location.pending': 'volgt',
  'status.active': 'Open',
  'status.paused': 'Gepauzeerd',
  'status.closed': 'Gesloten',
  'status.draft': 'Concept',
  'city.search': 'Zoek stad…',
}

const en: Dict = {
  'brand.view': 'Network view',
  'topbar.staging': 'Staging',
  'topbar.city': 'City',
  'metric.nodes': 'Nodes',
  'metric.plotted': 'On map',
  'metric.source': 'Source',
  'metric.update': 'Update',
  'status.loading': 'Loading…',
  'view.settings': 'View',
  'view.3d': '3D buildings',
  'view.3d.hint': 'OpenStreetMap extrusions',
  'view.time': 'View over time',
  'view.time.hint': 'Timeline of listings',
  'view.time.7d': '7 days',
  'view.time.30d': '30 days',
  'view.time.90d': '90 days',
  'legend.3d': '3D tiles · toggleable',
  'cursor.hint': 'Move over the map',
  'street.title': 'Street',
  'street.unknown': 'Unknown location',
  'street.empty': 'No listings on this street (yet).',
  'timeline.play': 'Play',
  'timeline.now': 'Now · live',
  'timeline.tonow': 'To now',
  'panel.close': 'Close',
  'panel.unnamed': 'Unnamed',
  'panel.status': 'Status',
  'panel.reactions': 'reactions',
  'panel.reaction': 'reaction',
  'panel.registered': 'registered in the staging network.',
  'panel.staging': 'STAGING',
  'panel.listing': 'listing',
  'panel.listings': 'listings',
  'panel.seemore': 'See more',
  'panel.verified': 'Verified',
  'panel.analytics': 'Activity',
  'panel.openSince': 'Open · {days}d',
  'panel.reactionsOverTime': 'Reactions over time',
  'panel.views': 'Views',
  'panel.reactRate': 'React rate',
  'panel.notForMe': 'Not for me',
  'panel.housemates': 'Housemates on Dibs',
  'panel.preSwiped': 'Pre-swiped',
  'marker.placedAgo': 'posted {days}d ago',
  'marker.views': '{n} views',
  'cityoverview.title': 'City overview',
  'location.empty': 'No location selected',
  'location.city': 'City',
  'location.postcode': 'Postcode',
  'location.street': 'Street',
  'location.district': 'District',
  'location.pending': 'pending',
  'status.active': 'Open',
  'status.paused': 'Paused',
  'status.closed': 'Closed',
  'status.draft': 'Draft',
  'city.search': 'Search city…',
}

const DICTS: Record<Lang, Dict> = { nl, en }

export type TFn = (key: string, vars?: Record<string, string | number>) => string

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TFn
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') {
    return 'nl'
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'nl' || stored === 'en') {
    return stored
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'nl'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => setLangState(next), [])

  const t = useCallback<TFn>(
    (key, vars) => {
      let str = DICTS[lang][key] ?? DICTS.nl[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return str
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}

export function useT(): TFn {
  return useI18n().t
}
