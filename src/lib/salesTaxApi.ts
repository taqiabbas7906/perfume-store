/**
 * US Sales Tax lookup via API Ninjas (https://api-ninjas.com/api/salestax)
 *
 * Given a ZIP code, returns a live, location-specific combined sales-tax
 * rate (state + county + city + special-district, when the API key has
 * premium access — state-only on the free tier).
 *
 * Requires API_NINJAS_KEY. Returns null when the key is missing, the ZIP
 * isn't recognised, or the upstream call fails/times out — callers should
 * treat null as "fall back to the state-level table" (see worldRates.ts).
 */

export interface ApiNinjasTaxResult {
    rate: number // decimal, e.g. 0.0975 = 9.75%
    label: string
    zipCode: string
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
  
  function toNumber(value: string | undefined): number | undefined {
    if (value === undefined) return undefined
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : undefined
  }
  
  /**
   * Look up the sales tax rate for a US ZIP code via API Ninjas.
   * Returns null if the key isn't configured, the ZIP wasn't found/valid,
   * or the request failed — the caller should fall back to state rates.
   */
  export async function fetchZipSalesTax(
    zipCode: string | null | undefined,
  ): Promise<ApiNinjasTaxResult | null> {
    const apiKey = process.env.API_NINJAS_KEY
    if (!apiKey || !zipCode) return null
  
    // API Ninjas expects a plain 5-digit US ZIP; tolerate ZIP+4 input.
    const zip = zipCode.trim().match(/^\d{5}/)?.[0]
    if (!zip) return null
  
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
  
      const res = await fetch(
        `https://api.api-ninjas.com/v1/salestax?zip_code=${encodeURIComponent(zip)}`,
        {
          headers: { 'X-Api-Key': apiKey },
          signal: controller.signal,
          next: { revalidate: 60 * 60 * 24 * 7 }, // 7 days
        },
      ).finally(() => clearTimeout(timeout))
  
      if (!res.ok) return null // includes 400/404 for unrecognised ZIPs
  
      const data = (await res.json()) as ApiNinjasSalesTaxEntry[]
      const entry = Array.isArray(data) ? data[0] : null
      if (!entry) return null // ZIP not found in API Ninjas' dataset
  
      const state = toNumber(entry.state_rate) ?? 0
      const county = toNumber(entry.county_rate)
      const city = toNumber(entry.city_rate)
      const additional = toNumber(entry.additional_rate)
      const total = toNumber(entry.total_rate)
  
      // total_rate is premium-only; on the free tier we sum whatever
      // component rates are present, so upgrading the plan improves
      // accuracy automatically without any code change.
      const rate = total ?? state + (county ?? 0) + (city ?? 0) + (additional ?? 0)
      if (!Number.isFinite(rate)) return null
  
      return {
        rate,
        label: 'Sales Tax',
        zipCode: entry.zip_code ?? zip,
        breakdown: { state, county, city, additional },
        isCombinedRate: total !== undefined,
        source: 'live',
      }
    } catch {
      // Network error, timeout, or malformed response — fall back.
      return null
    }
  }