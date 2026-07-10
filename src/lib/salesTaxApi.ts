/**
 * US Sales Tax lookup via API Ninjas (https://api-ninjas.com/api/salestax)
 *
 * Lookup order:
 * 1. ZIP / postal code
 * 2. City + state
 * 3. Hardcoded state fallback in `worldRates.ts` only for exception cases
 *    such as upstream failures, timeouts, missing config, or rate limits.
 */

export interface ApiNinjasTaxResult {
  rate: number // decimal, e.g. 0.0975 = 9.75%
  label: string
  lookupType: 'zip' | 'city'
  locationLabel: string
  zipCode?: string
  zipCodes?: string[]
  breakdown: {
    state: number
    county?: number
    city?: number
    additional?: number
  }
  /** true when total_rate came back (premium plan); false when we summed
   *  whatever component rates were available on the free tier. */
  isCombinedRate: boolean
  source: 'live'
}

interface ApiNinjasSalesTaxEntry {
  street_address?: string
  zip_code?: string
  state_rate?: string
  city_rate?: string
  county_rate?: string
  additional_rate?: string
  total_rate?: string
}

interface FetchUsSalesTaxInput {
  zipCode?: string | null
  city?: string | null
  state?: string | null
}

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeZip(zipCode: string | null | undefined): string | null {
  return zipCode?.trim().match(/^\d{5}/)?.[0] ?? null
}

function normalizeCity(city: string | null | undefined): string | null {
  const normalized = city?.trim()
  return normalized ? normalized : null
}

function normalizeStateName(state: string | null | undefined): string | null {
  const normalized = state?.trim()
  if (!normalized) return null
  const upper = normalized.toUpperCase()
  return US_STATE_NAMES[upper] ?? normalized
}

function getRate(entry: ApiNinjasSalesTaxEntry): {
  rate: number
  breakdown: ApiNinjasTaxResult['breakdown']
  isCombinedRate: boolean
} | null {
  const state = toNumber(entry.state_rate) ?? 0
  const county = toNumber(entry.county_rate)
  const city = toNumber(entry.city_rate)
  const additional = toNumber(entry.additional_rate)
  const total = toNumber(entry.total_rate)
  const rate = total ?? state + (county ?? 0) + (city ?? 0) + (additional ?? 0)
  if (!Number.isFinite(rate)) return null

  return {
    rate,
    breakdown: { state, county, city, additional },
    isCombinedRate: total !== undefined,
  }
}

async function fetchSalesTaxEntries(params: {
  zipCode?: string
  city?: string
  state?: string
}): Promise<ApiNinjasSalesTaxEntry[] | null> {
  const apiKey = process.env.API_NINJAS_KEY
  if (!apiKey) return null

  const url = new URL('https://api.api-ninjas.com/v1/salestax')
  if (params.zipCode) {
    url.searchParams.set('zip_code', params.zipCode)
  } else if (params.city && params.state) {
    url.searchParams.set('city', params.city)
    url.searchParams.set('state', params.state)
  } else {
    return null
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url.toString(), {
      headers: { 'X-Api-Key': apiKey },
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 * 7 },
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) return null

    const data = (await res.json()) as ApiNinjasSalesTaxEntry[]
    if (!Array.isArray(data) || data.length === 0) return null
    return data
  } catch {
    return null
  }
}

function buildZipResult(
  entry: ApiNinjasSalesTaxEntry,
  requestedZip: string,
): ApiNinjasTaxResult | null {
  const parsed = getRate(entry)
  if (!parsed) return null

  return {
    rate: parsed.rate,
    label: 'Sales Tax',
    lookupType: 'zip',
    locationLabel: `ZIP ${entry.zip_code ?? requestedZip}`,
    zipCode: entry.zip_code ?? requestedZip,
    breakdown: parsed.breakdown,
    isCombinedRate: parsed.isCombinedRate,
    source: 'live',
  }
}

function buildCityResult(
  entries: ApiNinjasSalesTaxEntry[],
  city: string,
  state: string,
): ApiNinjasTaxResult | null {
  const parsedEntries = entries
    .map((entry) => {
      const parsed = getRate(entry)
      if (!parsed) return null
      return { entry, parsed }
    })
    .filter(
      (
        value,
      ): value is {
        entry: ApiNinjasSalesTaxEntry
        parsed: NonNullable<ReturnType<typeof getRate>>
      } => value !== null,
    )

  if (parsedEntries.length === 0) return null

  const avg = (values: number[]): number | undefined => {
    if (values.length === 0) return undefined
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  const zipCodes = [
    ...new Set(
      parsedEntries
        .map(({ entry }) => entry.zip_code)
        .filter((value): value is string => Boolean(value)),
    ),
  ]
  const rate = avg(parsedEntries.map(({ parsed }) => parsed.rate))
  if (rate === undefined || !Number.isFinite(rate)) return null

  const stateRate = avg(parsedEntries.map(({ parsed }) => parsed.breakdown.state)) ?? 0
  const countyRate = avg(
    parsedEntries
      .map(({ parsed }) => parsed.breakdown.county)
      .filter((value): value is number => value !== undefined),
  )
  const cityRate = avg(
    parsedEntries
      .map(({ parsed }) => parsed.breakdown.city)
      .filter((value): value is number => value !== undefined),
  )
  const additionalRate = avg(
    parsedEntries
      .map(({ parsed }) => parsed.breakdown.additional)
      .filter((value): value is number => value !== undefined),
  )

  return {
    rate,
    label: 'Sales Tax',
    lookupType: 'city',
    locationLabel: `${city}, ${state}`,
    zipCodes: zipCodes.length > 0 ? zipCodes : undefined,
    breakdown: {
      state: stateRate,
      county: countyRate,
      city: cityRate,
      additional: additionalRate,
    },
    isCombinedRate: parsedEntries.every(({ parsed }) => parsed.isCombinedRate),
    source: 'live',
  }
}

export async function fetchUsSalesTax(
  input: FetchUsSalesTaxInput,
): Promise<ApiNinjasTaxResult | null> {
  const zip = normalizeZip(input.zipCode)
  if (zip) {
    const zipEntries = await fetchSalesTaxEntries({ zipCode: zip })
    const zipResult = zipEntries?.[0] ? buildZipResult(zipEntries[0], zip) : null
    if (zipResult) return zipResult
  }

  const city = normalizeCity(input.city)
  const state = normalizeStateName(input.state)
  if (!city || !state) return null

  const cityEntries = await fetchSalesTaxEntries({ city, state })
  if (!cityEntries) return null

  return buildCityResult(cityEntries, city, state)
}
