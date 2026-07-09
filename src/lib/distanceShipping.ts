/**
 * Distance-based shipping calculator.
 *
 * Takes a customer's destination postal code, looks up its coordinates via
 * Zippopotam.us, and produces 1–3 shipping options whose prices scale with
 * the great-circle distance to a configured warehouse origin.
 *
 * Origin is read from environment so the operator can move warehouses
 * without redeploying:
 *
 *   WAREHOUSE_LAT, WAREHOUSE_LNG  → numeric coordinates
 *   WAREHOUSE_COUNTRY             → ISO-2 country code (used to detect
 *                                    domestic shipping)
 *
 * Defaults to the Minzoshop storefront's West Palm Beach, FL location.
 *
 * If geocoding fails on both sides, the caller can detect that
 * (`source: 'fallback'`) and fall back to a flat zone table.
 */

import {
  geocodePostal,
  haversineKm,
  type GeoPoint,
} from '@/lib/geocode'

export interface DistanceShippingOption {
  id: string
  label: string
  price: number
  estimatedDays: string
  carrier: string
}

export interface DistanceShippingResult {
  options: DistanceShippingOption[]
  /** Computed distance in km between the warehouse and the customer. */
  distanceKm: number
  /** Live = both sides geocoded against the API; fallback = at least one
   *  side fell back to a country centroid. */
  source: 'live' | 'fallback'
}

function warehouseOrigin(): { point: GeoPoint; country: string } {
  const lat = parseFloat(process.env.WAREHOUSE_LAT ?? '')
  const lng = parseFloat(process.env.WAREHOUSE_LNG ?? '')
  const country = (process.env.WAREHOUSE_COUNTRY ?? 'US').toUpperCase()
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { point: { lat, lng, source: 'live' }, country }
  }
  // Default: West Palm Beach, Florida (Minzoshop' base of operations).
  return {
    point: { lat: 26.7153, lng: -80.0534, source: 'fallback' },
    country: 'US',
  }
}

/**
 * Tiered formula: a fixed base, plus a per-km charge that gets cheaper
 * the further you go (longer distances are dominated by linehaul, not
 * last-mile, so cost per km flattens). Distance-only — weight is a
 * future addition once product weights are populated.
 */
function priceForDistance(distanceKm: number, surcharge = 0): number {
  let price: number
  if (distanceKm < 50) price = 4.99
  else if (distanceKm < 250) price = 6.99
  else if (distanceKm < 800) price = 9.99
  else if (distanceKm < 2_500) price = 14.99
  else if (distanceKm < 6_500) price = 22.99
  else if (distanceKm < 11_000) price = 32.99
  else price = 44.99
  return Math.round((price + surcharge) * 100) / 100
}

function estimatedDays(distanceKm: number, tier: 'standard' | 'express'): string {
  if (tier === 'express') {
    if (distanceKm < 250) return '1–2 business days'
    if (distanceKm < 2_500) return '2–3 business days'
    if (distanceKm < 6_500) return '3–5 business days'
    return '4–7 business days'
  }
  if (distanceKm < 250) return '2–4 business days'
  if (distanceKm < 2_500) return '4–7 business days'
  if (distanceKm < 6_500) return '7–12 business days'
  return '10–18 business days'
}

/**
 * Build distance-based shipping options for a destination. The caller
 * should treat `source: 'fallback'` as a signal to optionally augment
 * with zone-based pricing — distance estimates are still useful from
 * country centroids but less precise.
 */
export async function calculateDistanceShipping(args: {
  country: string
  postalCode?: string | null
}): Promise<DistanceShippingResult | null> {
  const origin = warehouseOrigin()
  const dest = await geocodePostal(args.country, args.postalCode ?? null)
  if (!dest) return null

  const distanceKm = Math.max(1, Math.round(haversineKm(origin.point, dest)))
  const isDomestic = args.country.toUpperCase() === origin.country

  // Standard option for every destination.
  const standard: DistanceShippingOption = {
    id: 'standard',
    label: isDomestic ? 'Standard Delivery' : 'Standard International',
    price: priceForDistance(distanceKm),
    estimatedDays: estimatedDays(distanceKm, 'standard'),
    carrier: isDomestic ? 'USPS Ground' : 'International Mail',
  }

  // Express premium scales with the standard rate: +60 % on shorter hops,
  // +90 % once linehaul dominates. Capped at a reasonable maximum so
  // long-haul orders don't price themselves out.
  const expressSurcharge =
    distanceKm < 2_500 ? standard.price * 0.6 : standard.price * 0.9
  const express: DistanceShippingOption = {
    id: 'express',
    label: isDomestic ? 'Express Delivery' : 'Express International',
    price: priceForDistance(distanceKm, expressSurcharge),
    estimatedDays: estimatedDays(distanceKm, 'express'),
    carrier: isDomestic ? 'FedEx Express' : 'DHL Express',
  }

  // For close-in domestic shipments, also offer an overnight tier.
  const options: DistanceShippingOption[] = [standard, express]
  if (isDomestic && distanceKm < 3_500) {
    options.push({
      id: 'priority',
      label: 'Priority Overnight',
      price: priceForDistance(distanceKm, Math.max(20, standard.price * 2.4)),
      estimatedDays: 'Next business day',
      carrier: 'FedEx Overnight',
    })
  }

  // Live = both sides came from the API; otherwise fallback (centroid).
  const source: DistanceShippingResult['source'] =
    origin.point.source === 'live' && dest.source === 'live'
      ? 'live'
      : 'fallback'

  return { options, distanceKm, source }
}
