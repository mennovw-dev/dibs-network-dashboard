// Reverse geocoding via PDOK Locatieserver (free, NL-wide, CORS-enabled).
// Used to show the street / neighborhood under the cursor.

export interface GeoLocation {
  street: string | null
  postcode: string | null
  neighborhood: string | null
  city: string | null
}

const BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse'
const cache = new Map<string, GeoLocation | null>()

function key(lat: number, lon: number): string {
  // ~11m precision keeps the cache small while staying street-accurate.
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

function formatPostcode(raw: string | undefined): string | null {
  if (!raw) {
    return null
  }
  const m = raw.replace(/\s+/g, '').match(/^(\d{4})([A-Za-z]{2})$/)
  return m ? `${m[1]} ${m[2].toUpperCase()}` : raw
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeoLocation | null> {
  const k = key(lat, lon)
  if (cache.has(k)) {
    return cache.get(k) ?? null
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    rows: '1',
    type: 'adres',
    fl: 'straatnaam,postcode,woonplaatsnaam,wijknaam,buurtnaam,gemeentenaam',
  })

  try {
    const res = await fetch(`${BASE}?${params}`, { signal })
    if (!res.ok) {
      cache.set(k, null)
      return null
    }
    const data = await res.json()
    const doc = data?.response?.docs?.[0]
    if (!doc) {
      cache.set(k, null)
      return null
    }
    const loc: GeoLocation = {
      street: doc.straatnaam ?? null,
      postcode: formatPostcode(doc.postcode),
      neighborhood: doc.wijknaam ?? doc.buurtnaam ?? null,
      city: doc.woonplaatsnaam ?? doc.gemeentenaam ?? null,
    }
    cache.set(k, loc)
    return loc
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw err
    }
    cache.set(k, null)
    return null
  }
}

export function streetMatches(nodeStreet: string | null | undefined, street: string): boolean {
  if (!nodeStreet) {
    return false
  }
  const a = nodeStreet.toLowerCase().replace(/\d+.*$/, '').trim()
  const b = street.toLowerCase().trim()
  return a === b || a.startsWith(b) || b.startsWith(a)
}
