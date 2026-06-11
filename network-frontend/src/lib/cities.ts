export interface City {
  id: string
  name: string
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
  bounds: [[number, number], [number, number]]
}

export const NL_VIEW: Omit<City, 'id' | 'name'> = {
  center: [5.2913, 52.1326],
  zoom: 6.8,
  pitch: 0,
  bearing: 0,
  bounds: [
    [3.31, 50.75],
    [7.23, 53.58],
  ],
}

export const CITIES: City[] = [
  {
    id: 'utrecht',
    name: 'Utrecht',
    center: [5.1214, 52.0907],
    zoom: 12.4,
    pitch: 52,
    bearing: -18,
    bounds: [
      [5.03, 52.04],
      [5.21, 52.14],
    ],
  },
]

export const DEFAULT_CITY_ID = 'utrecht'

export function getCity(id: string | null | undefined): City | null {
  if (!id) {
    return null
  }
  return CITIES.find((c) => c.id === id) ?? null
}

export function cityFromUrl(): City | null {
  if (typeof window === 'undefined') {
    return null
  }
  const param = new URLSearchParams(window.location.search).get('city')
  return getCity(param)
}

export function writeCityToUrl(id: string | null) {
  if (typeof window === 'undefined') {
    return
  }
  const url = new URL(window.location.href)
  if (id) {
    url.searchParams.set('city', id)
  } else {
    url.searchParams.delete('city')
  }
  window.history.replaceState({}, '', url)
}
