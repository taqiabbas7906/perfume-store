/**
 * Shipping & Tax Rate Configuration
 *
 * US states: tax rates (%) + shipping tiers based on subtotal
 * International countries: flat shipping rates + 0% tax (VAT handled client-side)
 *
 * Shipping tiers:
 *   standard  — default ground/economy
 *   express   — 2-3 day
 *   free      — threshold met
 */

export interface ShippingTier {
  label: string
  price: number
  estimatedDays: string
}

export interface RateResult {
  taxRate: number        // decimal, e.g. 0.08 = 8%
  taxAmount: number      // computed from subtotal
  shipping: ShippingTier[]
  freeShippingThreshold: number | null
  currency: string
  region: string         // display name
}

/* ─────────────────────────────────────────────
 * US STATE TAX RATES
 * Source: 2024 combined state+avg-local rates
 * ───────────────────────────────────────────── */

export const US_STATE_RATES: Record<string, { name: string; taxRate: number }> = {
  AL: { name: 'Alabama', taxRate: 0.09 },
  AK: { name: 'Alaska', taxRate: 0.0 },
  AZ: { name: 'Arizona', taxRate: 0.084 },
  AR: { name: 'Arkansas', taxRate: 0.094 },
  CA: { name: 'California', taxRate: 0.0883 },
  CO: { name: 'Colorado', taxRate: 0.077 },
  CT: { name: 'Connecticut', taxRate: 0.0635 },
  DE: { name: 'Delaware', taxRate: 0.0 },
  FL: { name: 'Florida', taxRate: 0.07 },
  GA: { name: 'Georgia', taxRate: 0.073 },
  HI: { name: 'Hawaii', taxRate: 0.044 },
  ID: { name: 'Idaho', taxRate: 0.06 },
  IL: { name: 'Illinois', taxRate: 0.0882 },
  IN: { name: 'Indiana', taxRate: 0.07 },
  IA: { name: 'Iowa', taxRate: 0.0694 },
  KS: { name: 'Kansas', taxRate: 0.087 },
  KY: { name: 'Kentucky', taxRate: 0.06 },
  LA: { name: 'Louisiana', taxRate: 0.0952 },
  ME: { name: 'Maine', taxRate: 0.055 },
  MD: { name: 'Maryland', taxRate: 0.06 },
  MA: { name: 'Massachusetts', taxRate: 0.0625 },
  MI: { name: 'Michigan', taxRate: 0.06 },
  MN: { name: 'Minnesota', taxRate: 0.0751 },
  MS: { name: 'Mississippi', taxRate: 0.0707 },
  MO: { name: 'Missouri', taxRate: 0.0823 },
  MT: { name: 'Montana', taxRate: 0.0 },
  NE: { name: 'Nebraska', taxRate: 0.0694 },
  NV: { name: 'Nevada', taxRate: 0.082 },
  NH: { name: 'New Hampshire', taxRate: 0.0 },
  NJ: { name: 'New Jersey', taxRate: 0.066 },
  NM: { name: 'New Mexico', taxRate: 0.0783 },
  NY: { name: 'New York', taxRate: 0.0852 },
  NC: { name: 'North Carolina', taxRate: 0.069 },
  ND: { name: 'North Dakota', taxRate: 0.0696 },
  OH: { name: 'Ohio', taxRate: 0.0724 },
  OK: { name: 'Oklahoma', taxRate: 0.0896 },
  OR: { name: 'Oregon', taxRate: 0.0 },
  PA: { name: 'Pennsylvania', taxRate: 0.063 },
  RI: { name: 'Rhode Island', taxRate: 0.07 },
  SC: { name: 'South Carolina', taxRate: 0.0748 },
  SD: { name: 'South Dakota', taxRate: 0.0640 },
  TN: { name: 'Tennessee', taxRate: 0.0947 },
  TX: { name: 'Texas', taxRate: 0.082 },
  UT: { name: 'Utah', taxRate: 0.072 },
  VT: { name: 'Vermont', taxRate: 0.0624 },
  VA: { name: 'Virginia', taxRate: 0.0575 },
  WA: { name: 'Washington', taxRate: 0.0923 },
  WV: { name: 'West Virginia', taxRate: 0.065 },
  WI: { name: 'Wisconsin', taxRate: 0.0543 },
  WY: { name: 'Wyoming', taxRate: 0.054 },
  DC: { name: 'Washington D.C.', taxRate: 0.06 },
}

/* ─────────────────────────────────────────────
 * US SHIPPING TIERS
 * Free over $75, standard $7.99, express $14.99
 * ───────────────────────────────────────────── */

const US_FREE_THRESHOLD = 75

function usShippingTiers(subtotal: number): ShippingTier[] {
  const tiers: ShippingTier[] = []

  if (subtotal >= US_FREE_THRESHOLD) {
    tiers.push({ label: 'Free Standard Shipping', price: 0, estimatedDays: '5–7 business days' })
  } else {
    tiers.push({ label: 'Standard Shipping', price: 7.99, estimatedDays: '5–7 business days' })
  }

  tiers.push({ label: 'Express Shipping', price: 14.99, estimatedDays: '2–3 business days' })
  tiers.push({ label: 'Overnight Shipping', price: 29.99, estimatedDays: 'Next business day' })

  return tiers
}

/* ─────────────────────────────────────────────
 * INTERNATIONAL COUNTRY RATES
 * Flat shipping; tax = 0 (buyer handles VAT/import)
 * ───────────────────────────────────────────── */

interface CountryRate {
  name: string
  shippingStandard: number
  shippingExpress: number
  estimatedStandard: string
  estimatedExpress: string
  taxRate: number
}

export const INTERNATIONAL_RATES: Record<string, CountryRate> = {
  GB: { name: 'United Kingdom', shippingStandard: 12.99, shippingExpress: 24.99, estimatedStandard: '7–14 days', estimatedExpress: '3–5 days', taxRate: 0 },
  CA: { name: 'Canada', shippingStandard: 9.99, shippingExpress: 19.99, estimatedStandard: '7–10 days', estimatedExpress: '3–5 days', taxRate: 0 },
  AU: { name: 'Australia', shippingStandard: 14.99, shippingExpress: 29.99, estimatedStandard: '10–18 days', estimatedExpress: '5–7 days', taxRate: 0 },
  DE: { name: 'Germany', shippingStandard: 12.99, shippingExpress: 24.99, estimatedStandard: '8–14 days', estimatedExpress: '4–6 days', taxRate: 0 },
  FR: { name: 'France', shippingStandard: 12.99, shippingExpress: 24.99, estimatedStandard: '8–14 days', estimatedExpress: '4–6 days', taxRate: 0 },
  JP: { name: 'Japan', shippingStandard: 16.99, shippingExpress: 34.99, estimatedStandard: '10–18 days', estimatedExpress: '5–7 days', taxRate: 0 },
  AE: { name: 'United Arab Emirates', shippingStandard: 13.99, shippingExpress: 27.99, estimatedStandard: '8–15 days', estimatedExpress: '4–6 days', taxRate: 0 },
  SA: { name: 'Saudi Arabia', shippingStandard: 13.99, shippingExpress: 27.99, estimatedStandard: '8–15 days', estimatedExpress: '4–6 days', taxRate: 0 },
  PK: { name: 'Pakistan', shippingStandard: 11.99, shippingExpress: 22.99, estimatedStandard: '10–18 days', estimatedExpress: '5–8 days', taxRate: 0 },
  IN: { name: 'India', shippingStandard: 11.99, shippingExpress: 22.99, estimatedStandard: '10–18 days', estimatedExpress: '5–8 days', taxRate: 0 },
  SG: { name: 'Singapore', shippingStandard: 13.99, shippingExpress: 26.99, estimatedStandard: '8–15 days', estimatedExpress: '4–6 days', taxRate: 0 },
  NL: { name: 'Netherlands', shippingStandard: 12.99, shippingExpress: 24.99, estimatedStandard: '8–14 days', estimatedExpress: '4–6 days', taxRate: 0 },
  IT: { name: 'Italy', shippingStandard: 12.99, shippingExpress: 24.99, estimatedStandard: '8–14 days', estimatedExpress: '4–6 days', taxRate: 0 },
  ES: { name: 'Spain', shippingStandard: 12.99, shippingExpress: 24.99, estimatedStandard: '8–14 days', estimatedExpress: '4–6 days', taxRate: 0 },
  BR: { name: 'Brazil', shippingStandard: 17.99, shippingExpress: 34.99, estimatedStandard: '12–22 days', estimatedExpress: '6–10 days', taxRate: 0 },
  MX: { name: 'Mexico', shippingStandard: 10.99, shippingExpress: 21.99, estimatedStandard: '8–14 days', estimatedExpress: '4–6 days', taxRate: 0 },
  ZA: { name: 'South Africa', shippingStandard: 16.99, shippingExpress: 32.99, estimatedStandard: '12–22 days', estimatedExpress: '6–10 days', taxRate: 0 },
  NG: { name: 'Nigeria', shippingStandard: 17.99, shippingExpress: 34.99, estimatedStandard: '14–25 days', estimatedExpress: '7–12 days', taxRate: 0 },
  KR: { name: 'South Korea', shippingStandard: 14.99, shippingExpress: 28.99, estimatedStandard: '10–18 days', estimatedExpress: '5–7 days', taxRate: 0 },
  TR: { name: 'Turkey', shippingStandard: 13.99, shippingExpress: 26.99, estimatedStandard: '10–18 days', estimatedExpress: '5–7 days', taxRate: 0 },
}

// Fallback for unlisted countries
const REST_OF_WORLD: CountryRate = {
  name: 'International',
  shippingStandard: 19.99,
  shippingExpress: 39.99,
  estimatedStandard: '14–28 days',
  estimatedExpress: '7–12 days',
  taxRate: 0,
}

/* ─────────────────────────────────────────────
 * MAIN CALCULATION FUNCTION
 * ───────────────────────────────────────────── */

export interface RateInput {
  country: string       // 'US' for domestic, ISO-2 otherwise
  state?: string        // required when country === 'US'
  subtotal: number
}

export function calculateRates(input: RateInput): RateResult {
  const { country, state, subtotal } = input

  if (country === 'US') {
    const stateCode = (state || '').toUpperCase().trim()
    const stateData = US_STATE_RATES[stateCode]
    const taxRate = stateData?.taxRate ?? 0
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100
    const region = stateData ? `${stateData.name}, US` : 'United States'

    return {
      taxRate,
      taxAmount,
      shipping: usShippingTiers(subtotal),
      freeShippingThreshold: US_FREE_THRESHOLD,
      currency: 'USD',
      region,
    }
  }

  const countryCode = country.toUpperCase().trim()
  const countryData = INTERNATIONAL_RATES[countryCode] ?? REST_OF_WORLD
  const taxAmount = Math.round(subtotal * countryData.taxRate * 100) / 100

  return {
    taxRate: countryData.taxRate,
    taxAmount,
    shipping: [
      { label: 'Standard International', price: countryData.shippingStandard, estimatedDays: countryData.estimatedStandard },
      { label: 'Express International', price: countryData.shippingExpress, estimatedDays: countryData.estimatedExpress },
    ],
    freeShippingThreshold: null,
    currency: 'USD',
    region: countryData.name,
  }
}

/* ─────────────────────────────────────────────
 * HELPERS FOR FRONTEND DROPDOWNS
 * ───────────────────────────────────────────── */

export const US_STATES_LIST = Object.entries(US_STATE_RATES).map(([code, v]) => ({
  code,
  name: v.name,
})).sort((a, b) => a.name.localeCompare(b.name))

export const COUNTRIES_LIST = [
  { code: 'US', name: 'United States' },
  ...Object.entries(INTERNATIONAL_RATES)
    .map(([code, v]) => ({ code, name: v.name }))
    .sort((a, b) => a.name.localeCompare(b.name)),
]
