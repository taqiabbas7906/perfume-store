/**
 * Postal-code → lat/long geocoder built on Zippopotam.us
 * (free, no auth, no key, supports ~60 countries).
 *
 *   https://api.zippopotam.us/{countryCode}/{postalCode}
 *
 * Results are wrapped in Next's fetch cache (30 days) so a customer
 * shipping to the same ZIP twice never hits the upstream twice.
 *
 * Falls back to the country centroid (a small in-memory map of common
 * destination countries) when the upstream is unreachable or the postal
 * code is unknown, so shipping calculation never blocks on the network.
 */

export interface GeoPoint {
  lat: number
  lng: number
  /** Where the coordinates came from — useful for debugging / logging. */
  source: 'live' | 'cached' | 'fallback'
}

/* ─── Country centroid fallback (good enough for distance buckets) ─── */
const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.8283, lng: -98.5795 },
  CA: { lat: 56.1304, lng: -106.3468 },
  MX: { lat: 23.6345, lng: -102.5528 },
  GB: { lat: 55.3781, lng: -3.436 },
  IE: { lat: 53.4129, lng: -8.2439 },
  DE: { lat: 51.1657, lng: 10.4515 },
  FR: { lat: 46.6034, lng: 1.8883 },
  IT: { lat: 41.8719, lng: 12.5674 },
  ES: { lat: 40.4637, lng: -3.7492 },
  NL: { lat: 52.1326, lng: 5.2913 },
  BE: { lat: 50.5039, lng: 4.4699 },
  PT: { lat: 39.3999, lng: -8.2245 },
  CH: { lat: 46.8182, lng: 8.2275 },
  AT: { lat: 47.5162, lng: 14.5501 },
  SE: { lat: 60.1282, lng: 18.6435 },
  NO: { lat: 60.472, lng: 8.4689 },
  DK: { lat: 56.2639, lng: 9.5018 },
  FI: { lat: 61.9241, lng: 25.7482 },
  PL: { lat: 51.9194, lng: 19.1451 },
  CZ: { lat: 49.8175, lng: 15.473 },
  GR: { lat: 39.0742, lng: 21.8243 },
  HU: { lat: 47.1625, lng: 19.5033 },
  RO: { lat: 45.9432, lng: 24.9668 },
  AU: { lat: -25.2744, lng: 133.7751 },
  NZ: { lat: -40.9006, lng: 174.886 },
  JP: { lat: 36.2048, lng: 138.2529 },
  KR: { lat: 35.9078, lng: 127.7669 },
  CN: { lat: 35.8617, lng: 104.1954 },
  IN: { lat: 20.5937, lng: 78.9629 },
  SG: { lat: 1.3521, lng: 103.8198 },
  MY: { lat: 4.2105, lng: 101.9758 },
  TH: { lat: 15.87, lng: 100.9925 },
  PH: { lat: 12.8797, lng: 121.774 },
  ID: { lat: -0.7893, lng: 113.9213 },
  AE: { lat: 23.4241, lng: 53.8478 },
  SA: { lat: 23.8859, lng: 45.0792 },
  IL: { lat: 31.0461, lng: 34.8516 },
  ZA: { lat: -30.5595, lng: 22.9375 },
  EG: { lat: 26.8206, lng: 30.8025 },
  NG: { lat: 9.082, lng: 8.6753 },
  KE: { lat: -0.0236, lng: 37.9062 },
  BR: { lat: -14.235, lng: -51.9253 },
  AR: { lat: -38.4161, lng: -63.6167 },
  CO: { lat: 4.5709, lng: -74.2973 },
  CL: { lat: -35.6751, lng: -71.543 },
  RU: { lat: 61.524, lng: 105.3188 },
  TR: { lat: 38.9637, lng: 35.2433 },
}

/**
 * Zippopotam supports only ISO-2 codes in lowercase and a postal-code
 * format specific to each country. We do a cheap normalization here so
 * mixed-case / extra-space input doesn't fail the lookup.
 */
function normalizePostal(country: string, raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  if (country === 'CA') {
    // Canadian ZIPs are 6 chars (A1A 1A1). Zippopotam wants the first 3.
    return trimmed.replace(/\s+/g, '').slice(0, 3)
  }
  if (country === 'GB') {
    // UK postcodes use outward + inward, Zippopotam supports the full code.
    return trimmed.replace(/\s+/g, ' ')
  }
  return trimmed.replace(/\s+/g, '')
}

interface ZipResponse {
  places?: Array<{ latitude?: string; longitude?: string }>
}

/**
 * Geocode a postal code via Zippopotam. Returns the country centroid (or
 * null when neither the postal code nor the country are recognised).
 */
export async function geocodePostal(
  country: string,
  postalCode: string | undefined | null,
): Promise<GeoPoint | null> {
  const cc = country?.toUpperCase()
  if (!cc) return null

  // Without a postal code, fall back to the country centroid — gives a
  // distance bucket that's right for "anywhere in this country".
  if (!postalCode) {
    const c = COUNTRY_CENTROIDS[cc]
    return c ? { ...c, source: 'fallback' } : null
  }

  const normalized = normalizePostal(cc, postalCode)
  try {
    const res = await fetch(
      `https://api.zippopotam.us/${cc.toLowerCase()}/${encodeURIComponent(normalized)}`,
      { next: { revalidate: 60 * 60 * 24 * 30 } }, // 30 days
    )
    if (!res.ok) throw new Error(`zippopotam ${res.status}`)
    const data = (await res.json()) as ZipResponse
    const place = data.places?.[0]
    const lat = place?.latitude ? parseFloat(place.latitude) : NaN
    const lng = place?.longitude ? parseFloat(place.longitude) : NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('zippopotam: missing coords')
    }
    return { lat, lng, source: 'live' }
  } catch {
    const c = COUNTRY_CENTROIDS[cc]
    return c ? { ...c, source: 'fallback' } : null
  }
}

/**
 * Great-circle distance in kilometres between two points
 * (Haversine formula — accurate to <1 % for our purposes).
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371 // Earth radius, km
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
  return R * c
}
