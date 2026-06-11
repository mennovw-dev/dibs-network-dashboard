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
  'legend.3d': '3D tiles · in te schakelen',
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
  'legend.3d': '3D tiles · toggleable',
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
