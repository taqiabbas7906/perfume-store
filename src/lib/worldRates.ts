/**
 * worldRates.ts
 * ─────────────────────────────────────────────────────────────
 * Worldwide Tax + Shipping engine
 *
 * TAX  → api.vatcomply.com (free, no API key, EU official daily rates)
 *        + curated global fallback map for non-EU countries
 *
 * SHIP → Zone-based model derived from country region/subregion
 *        Zones: domestic(US) | zone1(CA/MX) | zone2(EU/UK) |
 *               zone3(Oceania) | zone4(Asia) | zone5(ME/Africa/LatAm) | zone6(rest)
 *
 * RestCountries (free, no auth) → region + subregion → zone assignment
 * Both external calls are cached server-side (Next.js fetch cache)
 * ─────────────────────────────────────────────────────────────
 */

/* ═══════════════════════ TYPES ════════════════════════ */
export interface ShippingOption {
  id: string
  label: string
  price: number
  estimatedDays: string
  carrier: string
}

export interface TaxInfo {
  rate: number      // decimal: 0.20 = 20%
  label: string     // "VAT", "GST", "Sales Tax"
  amount: number    // pre-computed from subtotal
  note?: string
}

export interface WorldRateResult {
  country: string
  countryName: string
  region: string
  tax: TaxInfo
  shipping: ShippingOption[]
  freeShippingThreshold: number | null
  rateSource: 'live' | 'cached' | 'fallback'
}

/* ═══════════════════════ US STATE SALES TAX ════════════════════════ */
// Blended state + avg-local rates (2024/25)
const US_STATE_TAX: Record<string, number> = {
  AL:0.09,   AK:0.00,   AZ:0.084,  AR:0.094,  CA:0.0883, CO:0.077,
  CT:0.0635, DE:0.00,   FL:0.07,   GA:0.073,  HI:0.044,  ID:0.06,
  IL:0.0882, IN:0.07,   IA:0.0694, KS:0.087,  KY:0.06,   LA:0.0952,
  ME:0.055,  MD:0.06,   MA:0.0625, MI:0.06,   MN:0.0751, MS:0.0707,
  MO:0.0823, MT:0.00,   NE:0.0694, NV:0.082,  NH:0.00,   NJ:0.066,
  NM:0.0783, NY:0.0852, NC:0.069,  ND:0.0696, OH:0.0724, OK:0.0896,
  OR:0.00,   PA:0.063,  RI:0.07,   SC:0.0748, SD:0.064,  TN:0.0947,
  TX:0.082,  UT:0.072,  VT:0.0624, VA:0.0575, WA:0.0923, WV:0.065,
  WI:0.0543, WY:0.054,  DC:0.06,
}

const US_STATE_NAMES: Record<string,string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',
  KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
  MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',
  NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',
  SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',
  VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',
  WI:'Wisconsin',WY:'Wyoming',DC:'Washington D.C.',
}

/* ═══════════════════════ NON-EU COUNTRY TAX FALLBACK ════════════════════════ */
interface FallbackTax { rate: number; label: string; note?: string }

const NON_EU_TAX: Record<string, FallbackTax> = {
  // North America
  US:{ rate:0,     label:'Sales Tax',       note:'Applied per state' },
  CA:{ rate:0.05,  label:'GST',             note:'Federal GST; provincial taxes vary' },
  MX:{ rate:0.16,  label:'IVA' },
  // UK (post-Brexit)
  GB:{ rate:0.20,  label:'VAT' },
  // South America
  BR:{ rate:0.12,  label:'ICMS' },
  AR:{ rate:0.21,  label:'IVA' },
  CO:{ rate:0.19,  label:'IVA' },
  CL:{ rate:0.19,  label:'IVA' },
  PE:{ rate:0.18,  label:'IGV' },
  // Oceania
  AU:{ rate:0.10,  label:'GST' },
  NZ:{ rate:0.15,  label:'GST' },
  // East Asia
  JP:{ rate:0.10,  label:'Consumption Tax' },
  CN:{ rate:0.13,  label:'VAT' },
  KR:{ rate:0.10,  label:'VAT' },
  TW:{ rate:0.05,  label:'VAT' },
  HK:{ rate:0.00,  label:'No Tax' },
  MO:{ rate:0.00,  label:'No Tax' },
  // Southeast Asia
  SG:{ rate:0.09,  label:'GST' },
  TH:{ rate:0.07,  label:'VAT' },
  MY:{ rate:0.08,  label:'SST' },
  ID:{ rate:0.11,  label:'PPN' },
  PH:{ rate:0.12,  label:'VAT' },
  VN:{ rate:0.10,  label:'VAT' },
  // South Asia
  IN:{ rate:0.18,  label:'GST',             note:'Standard slab; cosmetics at 18%' },
  PK:{ rate:0.17,  label:'GST' },
  BD:{ rate:0.15,  label:'VAT' },
  LK:{ rate:0.15,  label:'VAT' },
  NP:{ rate:0.13,  label:'VAT' },
  // Central Asia / Caucasus
  KZ:{ rate:0.12,  label:'VAT' },
  UZ:{ rate:0.12,  label:'VAT' },
  GE:{ rate:0.18,  label:'VAT' },
  AM:{ rate:0.20,  label:'VAT' },
  AZ:{ rate:0.18,  label:'VAT' },
  // Middle East
  AE:{ rate:0.05,  label:'VAT' },
  SA:{ rate:0.15,  label:'VAT' },
  QA:{ rate:0.00,  label:'No Tax' },
  KW:{ rate:0.00,  label:'No Tax' },
  BH:{ rate:0.10,  label:'VAT' },
  OM:{ rate:0.05,  label:'VAT' },
  JO:{ rate:0.16,  label:'GST' },
  LB:{ rate:0.11,  label:'VAT' },
  IQ:{ rate:0.00,  label:'No Tax' },
  IR:{ rate:0.09,  label:'VAT' },
  IL:{ rate:0.17,  label:'VAT' },
  TR:{ rate:0.20,  label:'KDV' },
  // Europe non-EU
  CH:{ rate:0.081, label:'MWST/TVA' },
  NO:{ rate:0.25,  label:'MVA' },
  IS:{ rate:0.24,  label:'VSK' },
  UA:{ rate:0.20,  label:'VAT' },
  RS:{ rate:0.20,  label:'PDV' },
  BY:{ rate:0.20,  label:'VAT' },
  RU:{ rate:0.20,  label:'НДС' },
  // Africa
  ZA:{ rate:0.15,  label:'VAT' },
  NG:{ rate:0.075, label:'VAT' },
  KE:{ rate:0.16,  label:'VAT' },
  EG:{ rate:0.14,  label:'VAT' },
  GH:{ rate:0.15,  label:'VAT' },
  MA:{ rate:0.20,  label:'TVA' },
  TZ:{ rate:0.18,  label:'VAT' },
  ET:{ rate:0.15,  label:'VAT' },
  CI:{ rate:0.18,  label:'TVA' },
  SN:{ rate:0.18,  label:'TVA' },
  CM:{ rate:0.1925,label:'VAT' },
  TN:{ rate:0.19,  label:'TVA' },
  DZ:{ rate:0.19,  label:'TVA' },
  AO:{ rate:0.14,  label:'VAT' },
  UG:{ rate:0.18,  label:'VAT' },
  MZ:{ rate:0.17,  label:'VAT' },
  ZM:{ rate:0.16,  label:'VAT' },
  ZW:{ rate:0.15,  label:'VAT' },
}

/* ═══════════════════════ SHIPPING ZONES ════════════════════════ */
type Zone = 'domestic'|'zone1'|'zone2'|'zone3'|'zone4'|'zone5'|'zone6'

// Explicit overrides (country takes priority over region mapping)
const COUNTRY_ZONE_OVERRIDE: Partial<Record<string, Zone>> = {
  CA:'zone1', MX:'zone1',
  GB:'zone2',
  AU:'zone3', NZ:'zone3',
}

function regionToZone(region: string, subregion: string): Zone {
  if (region === 'Europe')   return 'zone2'
  if (region === 'Oceania')  return 'zone3'
  if (region === 'Asia') {
    if (['Western Asia','Central Asia'].includes(subregion)) return 'zone5'
    return 'zone4'
  }
  if (region === 'Americas') {
    if (['Northern America'].includes(subregion)) return 'zone1'
    return 'zone5'
  }
  if (region === 'Africa')   return 'zone5'
  return 'zone6'
}

interface ZoneDef {
  freeThreshold: number | null
  options: ShippingOption[]
}

const ZONE_CONFIG: Record<Zone, ZoneDef> = {
  domestic: {
    freeThreshold: 75,
    options: [
      { id:'standard', label:'Standard (USPS)',     price:7.99,  estimatedDays:'5–7 business days',   carrier:'USPS Ground'     },
      { id:'express',  label:'Express (FedEx)',      price:14.99, estimatedDays:'2–3 business days',   carrier:'FedEx Express'   },
      { id:'priority', label:'Priority Overnight',  price:29.99, estimatedDays:'Next business day',    carrier:'FedEx Overnight' },
    ],
  },
  zone1: {       // Canada, Mexico
    freeThreshold: 120,
    options: [
      { id:'standard', label:'Standard International', price:9.99,  estimatedDays:'7–10 business days', carrier:'USPS Priority Intl' },
      { id:'express',  label:'Express International',  price:19.99, estimatedDays:'3–5 business days',  carrier:'FedEx Intl Priority' },
    ],
  },
  zone2: {       // Europe + UK
    freeThreshold: 150,
    options: [
      { id:'standard', label:'Standard (DHL)',          price:12.99, estimatedDays:'7–14 business days', carrier:'DHL eCommerce'  },
      { id:'express',  label:'Express (DHL)',            price:24.99, estimatedDays:'3–5 business days',  carrier:'DHL Express'    },
    ],
  },
  zone3: {       // Australia, NZ, Oceania
    freeThreshold: 200,
    options: [
      { id:'standard', label:'Standard International', price:14.99, estimatedDays:'10–18 business days', carrier:'Australia Post'  },
      { id:'express',  label:'Express (DHL)',            price:29.99, estimatedDays:'5–7 business days',   carrier:'DHL Express'    },
    ],
  },
  zone4: {       // Asia-Pacific
    freeThreshold: 180,
    options: [
      { id:'standard', label:'Standard (DHL)',          price:13.99, estimatedDays:'10–18 business days', carrier:'DHL eCommerce'  },
      { id:'express',  label:'Express (DHL)',            price:27.99, estimatedDays:'4–6 business days',   carrier:'DHL Express'    },
    ],
  },
  zone5: {       // Middle East, Africa, LatAm
    freeThreshold: 200,
    options: [
      { id:'standard', label:'Standard International', price:16.99, estimatedDays:'12–22 business days', carrier:'DHL eCommerce'  },
      { id:'express',  label:'Express (DHL)',            price:32.99, estimatedDays:'5–8 business days',   carrier:'DHL Express'    },
    ],
  },
  zone6: {       // Rest of world
    freeThreshold: null,
    options: [
      { id:'standard', label:'Standard International', price:19.99, estimatedDays:'14–28 business days', carrier:'Intl Courier'   },
      { id:'express',  label:'Express (DHL)',            price:39.99, estimatedDays:'7–12 business days',  carrier:'DHL Express'    },
    ],
  },
}

function buildShipping(zone: Zone, subtotal: number): { options: ShippingOption[]; freeThreshold: number | null } {
  const cfg = ZONE_CONFIG[zone]
  const free = cfg.freeThreshold !== null && subtotal >= cfg.freeThreshold

  const options: ShippingOption[] = cfg.options.map((opt, i) => {
    if (i === 0 && free) {
      return { ...opt, id:'free', label:`Free ${opt.label}`, price: 0 }
    }
    return opt
  })

  return { options, freeThreshold: cfg.freeThreshold }
}

/* ═══════════════════════ VATCOMPLY API ════════════════════════ */
// EU countries covered by vatcomply (uses EL for Greece per EU convention)
const EU_ISO2 = new Set([
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR',
  'GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL',
  'PT','RO','SE','SI','SK',
])

async function fetchVatRate(countryCode: string): Promise<{ rate: number; source: 'live'|'fallback' }> {
  if (!EU_ISO2.has(countryCode)) {
    const fb = NON_EU_TAX[countryCode]
    return { rate: fb?.rate ?? 0, source: 'fallback' }
  }
  // vatcomply uses EL for Greece
  const code = countryCode === 'GR' ? 'EL' : countryCode
  try {
    const res = await fetch(
      `https://api.vatcomply.com/vat_rates?country_code=${code}`,
      { next: { revalidate: 86400 } }   // Next.js cache 24h
    )
    if (!res.ok) throw new Error('vatcomply error')
    const data = await res.json()
    const rate = typeof data.standard_rate === 'number' ? data.standard_rate / 100 : 0
    return { rate, source: 'live' }
  } catch {
    // EU fallback hardcoded rates
    const EU_FALLBACK: Record<string,number> = {
      AT:0.20, BE:0.21, BG:0.20, CY:0.19, CZ:0.21, DE:0.19, DK:0.25,
      EE:0.22, ES:0.21, FI:0.255,FR:0.20, GR:0.24, HR:0.25, HU:0.27,
      IE:0.23, IT:0.22, LT:0.21, LU:0.17, LV:0.21, MT:0.18, NL:0.21,
      PL:0.23, PT:0.23, RO:0.19, SE:0.25, SI:0.22, SK:0.20,
    }
    return { rate: EU_FALLBACK[countryCode] ?? 0, source: 'fallback' }
  }
}

/* ═══════════════════════ RESTCOUNTRIES API ════════════════════════ */
interface CountryMeta { name: string; region: string; subregion: string }

// Inline fallback so UI never blocks on network
const COUNTRY_META_FALLBACK: Record<string, CountryMeta> = {
  US:{name:'United States',       region:'Americas',  subregion:'Northern America'},
  CA:{name:'Canada',              region:'Americas',  subregion:'Northern America'},
  MX:{name:'Mexico',              region:'Americas',  subregion:'Central America'},
  GB:{name:'United Kingdom',      region:'Europe',    subregion:'Northern Europe'},
  DE:{name:'Germany',             region:'Europe',    subregion:'Western Europe'},
  FR:{name:'France',              region:'Europe',    subregion:'Western Europe'},
  IT:{name:'Italy',               region:'Europe',    subregion:'Southern Europe'},
  ES:{name:'Spain',               region:'Europe',    subregion:'Southern Europe'},
  NL:{name:'Netherlands',         region:'Europe',    subregion:'Western Europe'},
  BE:{name:'Belgium',             region:'Europe',    subregion:'Western Europe'},
  PL:{name:'Poland',              region:'Europe',    subregion:'Eastern Europe'},
  SE:{name:'Sweden',              region:'Europe',    subregion:'Northern Europe'},
  NO:{name:'Norway',              region:'Europe',    subregion:'Northern Europe'},
  CH:{name:'Switzerland',         region:'Europe',    subregion:'Western Europe'},
  AT:{name:'Austria',             region:'Europe',    subregion:'Western Europe'},
  PT:{name:'Portugal',            region:'Europe',    subregion:'Southern Europe'},
  GR:{name:'Greece',              region:'Europe',    subregion:'Southern Europe'},
  DK:{name:'Denmark',             region:'Europe',    subregion:'Northern Europe'},
  FI:{name:'Finland',             region:'Europe',    subregion:'Northern Europe'},
  IE:{name:'Ireland',             region:'Europe',    subregion:'Northern Europe'},
  HU:{name:'Hungary',             region:'Europe',    subregion:'Eastern Europe'},
  CZ:{name:'Czechia',             region:'Europe',    subregion:'Eastern Europe'},
  RO:{name:'Romania',             region:'Europe',    subregion:'Eastern Europe'},
  SK:{name:'Slovakia',            region:'Europe',    subregion:'Eastern Europe'},
  HR:{name:'Croatia',             region:'Europe',    subregion:'Southern Europe'},
  BG:{name:'Bulgaria',            region:'Europe',    subregion:'Eastern Europe'},
  LT:{name:'Lithuania',           region:'Europe',    subregion:'Northern Europe'},
  LV:{name:'Latvia',              region:'Europe',    subregion:'Northern Europe'},
  EE:{name:'Estonia',             region:'Europe',    subregion:'Northern Europe'},
  SI:{name:'Slovenia',            region:'Europe',    subregion:'Southern Europe'},
  MT:{name:'Malta',               region:'Europe',    subregion:'Southern Europe'},
  CY:{name:'Cyprus',              region:'Europe',    subregion:'Southern Europe'},
  LU:{name:'Luxembourg',          region:'Europe',    subregion:'Western Europe'},
  UA:{name:'Ukraine',             region:'Europe',    subregion:'Eastern Europe'},
  RS:{name:'Serbia',              region:'Europe',    subregion:'Southern Europe'},
  TR:{name:'Turkey',              region:'Asia',      subregion:'Western Asia'},
  AU:{name:'Australia',           region:'Oceania',   subregion:'Australia and New Zealand'},
  NZ:{name:'New Zealand',         region:'Oceania',   subregion:'Australia and New Zealand'},
  JP:{name:'Japan',               region:'Asia',      subregion:'Eastern Asia'},
  CN:{name:'China',               region:'Asia',      subregion:'Eastern Asia'},
  KR:{name:'South Korea',         region:'Asia',      subregion:'Eastern Asia'},
  IN:{name:'India',               region:'Asia',      subregion:'Southern Asia'},
  PK:{name:'Pakistan',            region:'Asia',      subregion:'Southern Asia'},
  BD:{name:'Bangladesh',          region:'Asia',      subregion:'Southern Asia'},
  SG:{name:'Singapore',           region:'Asia',      subregion:'South-Eastern Asia'},
  MY:{name:'Malaysia',            region:'Asia',      subregion:'South-Eastern Asia'},
  TH:{name:'Thailand',            region:'Asia',      subregion:'South-Eastern Asia'},
  ID:{name:'Indonesia',           region:'Asia',      subregion:'South-Eastern Asia'},
  PH:{name:'Philippines',         region:'Asia',      subregion:'South-Eastern Asia'},
  VN:{name:'Vietnam',             region:'Asia',      subregion:'South-Eastern Asia'},
  AE:{name:'United Arab Emirates',region:'Asia',      subregion:'Western Asia'},
  SA:{name:'Saudi Arabia',        region:'Asia',      subregion:'Western Asia'},
  IL:{name:'Israel',              region:'Asia',      subregion:'Western Asia'},
  JO:{name:'Jordan',              region:'Asia',      subregion:'Western Asia'},
  KW:{name:'Kuwait',              region:'Asia',      subregion:'Western Asia'},
  QA:{name:'Qatar',               region:'Asia',      subregion:'Western Asia'},
  BH:{name:'Bahrain',             region:'Asia',      subregion:'Western Asia'},
  OM:{name:'Oman',                region:'Asia',      subregion:'Western Asia'},
  IR:{name:'Iran',                region:'Asia',      subregion:'Western Asia'},
  IQ:{name:'Iraq',                region:'Asia',      subregion:'Western Asia'},
  ZA:{name:'South Africa',        region:'Africa',    subregion:'Southern Africa'},
  NG:{name:'Nigeria',             region:'Africa',    subregion:'Western Africa'},
  KE:{name:'Kenya',               region:'Africa',    subregion:'Eastern Africa'},
  EG:{name:'Egypt',               region:'Africa',    subregion:'Northern Africa'},
  GH:{name:'Ghana',               region:'Africa',    subregion:'Western Africa'},
  MA:{name:'Morocco',             region:'Africa',    subregion:'Northern Africa'},
  TZ:{name:'Tanzania',            region:'Africa',    subregion:'Eastern Africa'},
  ET:{name:'Ethiopia',            region:'Africa',    subregion:'Eastern Africa'},
  BR:{name:'Brazil',              region:'Americas',  subregion:'South America'},
  AR:{name:'Argentina',           region:'Americas',  subregion:'South America'},
  CO:{name:'Colombia',            region:'Americas',  subregion:'South America'},
  CL:{name:'Chile',               region:'Americas',  subregion:'South America'},
  PE:{name:'Peru',                region:'Americas',  subregion:'South America'},
  RU:{name:'Russia',              region:'Europe',    subregion:'Eastern Europe'},
  HK:{name:'Hong Kong',           region:'Asia',      subregion:'Eastern Asia'},
  TW:{name:'Taiwan',              region:'Asia',      subregion:'Eastern Asia'},
  IS:{name:'Iceland',             region:'Europe',    subregion:'Northern Europe'},
}

async function fetchCountryMeta(code: string): Promise<CountryMeta> {
  const fallback = COUNTRY_META_FALLBACK[code]
  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/alpha/${code}?fields=name,region,subregion`,
      { next: { revalidate: 604800 } }  // cache 7 days
    )
    if (!res.ok) throw new Error('restcountries error')
    const raw = await res.json()
    const data = Array.isArray(raw) ? raw[0] : raw
    return {
      name: data?.name?.common ?? fallback?.name ?? code,
      region: data?.region ?? fallback?.region ?? 'Unknown',
      subregion: data?.subregion ?? fallback?.subregion ?? '',
    }
  } catch {
    return fallback ?? { name: code, region: 'Unknown', subregion: '' }
  }
}

/* ═══════════════════════ TAX LABEL HELPER ════════════════════════ */
function getTaxLabel(countryCode: string, region: string): string {
  if (countryCode === 'US') return 'Sales Tax'
  if (countryCode === 'CA') return 'GST'
  const nonEu = NON_EU_TAX[countryCode]
  if (nonEu) return nonEu.label
  if (region === 'Europe') return 'VAT'
  return 'Tax'
}

function getTaxNote(countryCode: string): string | undefined {
  if (countryCode === 'US') return 'Applied per state/local rate'
  if (countryCode === 'CA') return 'Federal GST only; provincial taxes may apply'
  return NON_EU_TAX[countryCode]?.note
}

/* ═══════════════════════ MAIN EXPORT ════════════════════════ */
import { calculateDistanceShipping } from '@/lib/distanceShipping'

export interface WorldRateInput {
  country: string    // ISO-2
  state?: string     // required when country === 'US'
  subtotal: number
  /**
   * Customer's postal/ZIP code. When present we geocode it via
   * Zippopotam.us and compute shipping from the actual great-circle
   * distance to the warehouse. Without it we fall back to the
   * zone-based table.
   */
  postalCode?: string | null
}

/**
 * Apply the same free-shipping threshold to a distance-based options list
 * that the zone calculator applies — keeps "Free Standard" behaviour
 * consistent regardless of which path produced the rates.
 */
function applyFreeThreshold(
  options: ShippingOption[],
  subtotal: number,
  freeThreshold: number | null,
): ShippingOption[] {
  if (freeThreshold === null || subtotal < freeThreshold) return options
  return options.map((opt, i) =>
    i === 0
      ? { ...opt, id: 'free', label: `Free ${opt.label}`, price: 0 }
      : opt,
  )
}

export async function getWorldRates(input: WorldRateInput): Promise<WorldRateResult> {
  const country = input.country.toUpperCase()
  const subtotal = input.subtotal
  const postalCode = input.postalCode ?? null

  /* ── US: state-level tax + domestic shipping ── */
  if (country === 'US') {
    const state = (input.state ?? '').toUpperCase()
    const taxRate = US_STATE_TAX[state] ?? 0
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100
    const stateName = US_STATE_NAMES[state] ?? state

    // Try distance-based shipping first; fall back to the zone table.
    const distance = await calculateDistanceShipping({ country, postalCode })
    let shipping: ShippingOption[]
    let freeThreshold: number | null
    let shippingSource: 'live' | 'fallback'
    if (distance && distance.source === 'live') {
      shipping = applyFreeThreshold(
        distance.options,
        subtotal,
        ZONE_CONFIG.domestic.freeThreshold,
      )
      freeThreshold = ZONE_CONFIG.domestic.freeThreshold
      shippingSource = 'live'
    } else {
      const zoned = buildShipping('domestic', subtotal)
      shipping = zoned.options
      freeThreshold = zoned.freeThreshold
      shippingSource = 'fallback'
    }

    return {
      country,
      countryName: 'United States',
      region: stateName,
      tax: {
        rate: taxRate,
        label: 'Sales Tax',
        amount: taxAmount,
        note: taxRate === 0 ? 'No state sales tax' : undefined,
      },
      shipping,
      freeShippingThreshold: freeThreshold,
      rateSource: shippingSource === 'live' ? 'live' : 'fallback',
    }
  }

  /* ── International ── */
  const [meta, vatData, distance] = await Promise.all([
    fetchCountryMeta(country),
    fetchVatRate(country),
    calculateDistanceShipping({ country, postalCode }),
  ])

  const zone: Zone =
    COUNTRY_ZONE_OVERRIDE[country] ?? regionToZone(meta.region, meta.subregion)
  const zoneCfg = ZONE_CONFIG[zone]

  let shipping: ShippingOption[]
  let shippingSource: 'live' | 'fallback'
  if (distance && distance.source === 'live') {
    shipping = applyFreeThreshold(distance.options, subtotal, zoneCfg.freeThreshold)
    shippingSource = 'live'
  } else {
    shipping = buildShipping(zone, subtotal).options
    shippingSource = 'fallback'
  }

  const taxAmount = Math.round(subtotal * vatData.rate * 100) / 100
  const taxLabel = getTaxLabel(country, meta.region)
  const taxNote  = getTaxNote(country)

  return {
    country,
    countryName: meta.name,
    region: meta.subregion || meta.region,
    tax: {
      rate: vatData.rate,
      label: taxLabel,
      amount: taxAmount,
      ...(taxNote ? { note: taxNote } : {}),
    },
    shipping,
    freeShippingThreshold: zoneCfg.freeThreshold,
    rateSource:
      vatData.source === 'live' && shippingSource === 'live' ? 'live' : 'fallback',
  }
}

/* ═══════════════════════ DROPDOWN DATA ════════════════════════ */
export const ALL_COUNTRIES = [
  { code:'AF', name:'Afghanistan' },{ code:'AL', name:'Albania' },
  { code:'DZ', name:'Algeria' },    { code:'AD', name:'Andorra' },
  { code:'AO', name:'Angola' },     { code:'AG', name:'Antigua and Barbuda' },
  { code:'AR', name:'Argentina' },  { code:'AM', name:'Armenia' },
  { code:'AU', name:'Australia' },  { code:'AT', name:'Austria' },
  { code:'AZ', name:'Azerbaijan' }, { code:'BS', name:'Bahamas' },
  { code:'BH', name:'Bahrain' },    { code:'BD', name:'Bangladesh' },
  { code:'BB', name:'Barbados' },   { code:'BY', name:'Belarus' },
  { code:'BE', name:'Belgium' },    { code:'BZ', name:'Belize' },
  { code:'BJ', name:'Benin' },      { code:'BT', name:'Bhutan' },
  { code:'BO', name:'Bolivia' },    { code:'BA', name:'Bosnia and Herzegovina' },
  { code:'BW', name:'Botswana' },   { code:'BR', name:'Brazil' },
  { code:'BN', name:'Brunei' },     { code:'BG', name:'Bulgaria' },
  { code:'BF', name:'Burkina Faso' },{ code:'BI', name:'Burundi' },
  { code:'CV', name:'Cabo Verde' }, { code:'KH', name:'Cambodia' },
  { code:'CM', name:'Cameroon' },   { code:'CA', name:'Canada' },
  { code:'CF', name:'Central African Republic' },
  { code:'TD', name:'Chad' },       { code:'CL', name:'Chile' },
  { code:'CN', name:'China' },      { code:'CO', name:'Colombia' },
  { code:'KM', name:'Comoros' },    { code:'CG', name:'Congo' },
  { code:'CD', name:'DR Congo' },   { code:'CR', name:'Costa Rica' },
  { code:'CI', name:"Côte d'Ivoire" },
  { code:'HR', name:'Croatia' },    { code:'CU', name:'Cuba' },
  { code:'CY', name:'Cyprus' },     { code:'CZ', name:'Czechia' },
  { code:'DK', name:'Denmark' },    { code:'DJ', name:'Djibouti' },
  { code:'DM', name:'Dominica' },   { code:'DO', name:'Dominican Republic' },
  { code:'EC', name:'Ecuador' },    { code:'EG', name:'Egypt' },
  { code:'SV', name:'El Salvador' },{ code:'GQ', name:'Equatorial Guinea' },
  { code:'ER', name:'Eritrea' },    { code:'EE', name:'Estonia' },
  { code:'SZ', name:'Eswatini' },   { code:'ET', name:'Ethiopia' },
  { code:'FJ', name:'Fiji' },       { code:'FI', name:'Finland' },
  { code:'FR', name:'France' },     { code:'GA', name:'Gabon' },
  { code:'GM', name:'Gambia' },     { code:'GE', name:'Georgia' },
  { code:'DE', name:'Germany' },    { code:'GH', name:'Ghana' },
  { code:'GR', name:'Greece' },     { code:'GD', name:'Grenada' },
  { code:'GT', name:'Guatemala' },  { code:'GN', name:'Guinea' },
  { code:'GW', name:'Guinea-Bissau' },{ code:'GY', name:'Guyana' },
  { code:'HT', name:'Haiti' },      { code:'HN', name:'Honduras' },
  { code:'HK', name:'Hong Kong' },  { code:'HU', name:'Hungary' },
  { code:'IS', name:'Iceland' },    { code:'IN', name:'India' },
  { code:'ID', name:'Indonesia' },  { code:'IR', name:'Iran' },
  { code:'IQ', name:'Iraq' },       { code:'IE', name:'Ireland' },
  { code:'IL', name:'Israel' },     { code:'IT', name:'Italy' },
  { code:'JM', name:'Jamaica' },    { code:'JP', name:'Japan' },
  { code:'JO', name:'Jordan' },     { code:'KZ', name:'Kazakhstan' },
  { code:'KE', name:'Kenya' },      { code:'KI', name:'Kiribati' },
  { code:'KW', name:'Kuwait' },     { code:'KG', name:'Kyrgyzstan' },
  { code:'LA', name:'Laos' },       { code:'LV', name:'Latvia' },
  { code:'LB', name:'Lebanon' },    { code:'LS', name:'Lesotho' },
  { code:'LR', name:'Liberia' },    { code:'LY', name:'Libya' },
  { code:'LI', name:'Liechtenstein' },{ code:'LT', name:'Lithuania' },
  { code:'LU', name:'Luxembourg' }, { code:'MG', name:'Madagascar' },
  { code:'MW', name:'Malawi' },     { code:'MY', name:'Malaysia' },
  { code:'MV', name:'Maldives' },   { code:'ML', name:'Mali' },
  { code:'MT', name:'Malta' },      { code:'MH', name:'Marshall Islands' },
  { code:'MR', name:'Mauritania' }, { code:'MU', name:'Mauritius' },
  { code:'MX', name:'Mexico' },     { code:'FM', name:'Micronesia' },
  { code:'MD', name:'Moldova' },    { code:'MC', name:'Monaco' },
  { code:'MN', name:'Mongolia' },   { code:'ME', name:'Montenegro' },
  { code:'MA', name:'Morocco' },    { code:'MZ', name:'Mozambique' },
  { code:'MM', name:'Myanmar' },    { code:'NA', name:'Namibia' },
  { code:'NR', name:'Nauru' },      { code:'NP', name:'Nepal' },
  { code:'NL', name:'Netherlands' },{ code:'NZ', name:'New Zealand' },
  { code:'NI', name:'Nicaragua' },  { code:'NE', name:'Niger' },
  { code:'NG', name:'Nigeria' },    { code:'NO', name:'Norway' },
  { code:'OM', name:'Oman' },       { code:'PK', name:'Pakistan' },
  { code:'PW', name:'Palau' },      { code:'PA', name:'Panama' },
  { code:'PG', name:'Papua New Guinea' },
  { code:'PY', name:'Paraguay' },   { code:'PE', name:'Peru' },
  { code:'PH', name:'Philippines' },{ code:'PL', name:'Poland' },
  { code:'PT', name:'Portugal' },   { code:'QA', name:'Qatar' },
  { code:'RO', name:'Romania' },    { code:'RU', name:'Russia' },
  { code:'RW', name:'Rwanda' },     { code:'KN', name:'Saint Kitts and Nevis' },
  { code:'LC', name:'Saint Lucia' },{ code:'VC', name:'Saint Vincent and the Grenadines' },
  { code:'WS', name:'Samoa' },      { code:'SM', name:'San Marino' },
  { code:'ST', name:'Sao Tome and Principe' },
  { code:'SA', name:'Saudi Arabia' },{ code:'SN', name:'Senegal' },
  { code:'RS', name:'Serbia' },     { code:'SC', name:'Seychelles' },
  { code:'SL', name:'Sierra Leone' },{ code:'SG', name:'Singapore' },
  { code:'SK', name:'Slovakia' },   { code:'SI', name:'Slovenia' },
  { code:'SB', name:'Solomon Islands' },
  { code:'SO', name:'Somalia' },    { code:'ZA', name:'South Africa' },
  { code:'SS', name:'South Sudan' },{ code:'ES', name:'Spain' },
  { code:'LK', name:'Sri Lanka' },  { code:'SD', name:'Sudan' },
  { code:'SR', name:'Suriname' },   { code:'SE', name:'Sweden' },
  { code:'CH', name:'Switzerland' },{ code:'SY', name:'Syria' },
  { code:'TW', name:'Taiwan' },     { code:'TJ', name:'Tajikistan' },
  { code:'TZ', name:'Tanzania' },   { code:'TH', name:'Thailand' },
  { code:'TL', name:'Timor-Leste' },{ code:'TG', name:'Togo' },
  { code:'TO', name:'Tonga' },      { code:'TT', name:'Trinidad and Tobago' },
  { code:'TN', name:'Tunisia' },    { code:'TR', name:'Turkey' },
  { code:'TM', name:'Turkmenistan' },
  { code:'TV', name:'Tuvalu' },     { code:'UG', name:'Uganda' },
  { code:'UA', name:'Ukraine' },    { code:'AE', name:'United Arab Emirates' },
  { code:'GB', name:'United Kingdom' },
  { code:'US', name:'United States' },
  { code:'UY', name:'Uruguay' },    { code:'UZ', name:'Uzbekistan' },
  { code:'VU', name:'Vanuatu' },    { code:'VE', name:'Venezuela' },
  { code:'VN', name:'Vietnam' },    { code:'YE', name:'Yemen' },
  { code:'ZM', name:'Zambia' },     { code:'ZW', name:'Zimbabwe' },
]

export const US_STATES = Object.entries(US_STATE_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name))
