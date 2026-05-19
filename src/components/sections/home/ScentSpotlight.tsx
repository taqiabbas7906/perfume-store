import ScentSpotlightClient, {
  type SpotlightItem,
} from './ScentSpotlightClient'
import type {
  StorefrontProduct,
  StorefrontProductListResponse,
} from '@/types/storefront'

export const dynamic = 'force-dynamic'

/* ─── helpers ────────────────────────────────────────────────── */

function pickImage(p: StorefrontProduct): string {
  const primary = p.images.find((i) => i.isPrimary) ?? p.images[0]
  return primary?.url ?? ''
}

function pickPrice(p: StorefrontProduct): { price: number; originalPrice: number } {
  const v = p.variants[0]
  if (v) {
    const original = v.originalPrice
    const price = v.discountedPrice != null ? v.discountedPrice : original
    return { price, originalPrice: original }
  }
  // Fallback to product-level rollup if there are somehow no variants.
  return { price: p.minPrice, originalPrice: p.maxPrice || p.minPrice }
}

function pickNotes(p: StorefrontProduct): string[] {
  // Perfume products carry `attributes.notes = { top, middle, base }`.
  const notes = (p.attributes?.notes as
    | { top?: string[]; middle?: string[]; base?: string[] }
    | undefined) ?? {}
  const all = [
    ...(notes.top ?? []),
    ...(notes.middle ?? []),
    ...(notes.base ?? []),
  ]
    .map((n) => n.trim())
    .filter(Boolean)
  if (all.length > 0) return Array.from(new Set(all)).slice(0, 5)
  // Non-perfume fall back to tags so the row isn't empty.
  return (p.tags ?? []).slice(0, 5)
}

function pickTagline(p: StorefrontProduct): string {
  // Hidden-but-supported: admins can set attributes.tagline manually.
  const raw = p.attributes?.tagline
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  if (p.isLimitedEdition) return 'A Limited Edition Selection'
  return 'A Featured Selection'
}

function pickDescription(p: StorefrontProduct): string {
  const raw = p.description ?? ''
  if (raw.length <= 280) return raw
  // Cut at the nearest word boundary so it doesn't end mid-word.
  const cut = raw.slice(0, 280).replace(/\s+\S*$/, '')
  return `${cut}…`
}

function toSpotlight(p: StorefrontProduct): SpotlightItem {
  const { price, originalPrice } = pickPrice(p)
  return {
    id: p._id,
    brand: p.brand,
    name: p.name,
    tagline: pickTagline(p),
    desc: pickDescription(p),
    notes: pickNotes(p),
    price,
    originalPrice,
    size: p.variants[0]?.label ?? '',
    rating: p.ratingAverage ?? 0,
    reviews: p.ratingCount ?? 0,
    href: `/product/${p.slug}`,
    image: pickImage(p),
  }
}

/* ─── fetch ──────────────────────────────────────────────────── */

async function fetchFeatured(): Promise<StorefrontProduct[]> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    // `?featured=true` is already supported by /api/products. Pick top
    // featured items by popularity so the spotlight surfaces the ones
    // customers are actually engaging with.
    const res = await fetch(
      `${base}/api/products?featured=true&limit=4&sort=popular`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as StorefrontProductListResponse
    if (!data?.success) return []
    // Need an image to render the spotlight nicely — drop any without one.
    return data.products.filter((p) => p.images.length > 0)
  } catch {
    return []
  }
}

/* ─── component ──────────────────────────────────────────────── */

export default async function ScentSpotlight() {
  const products = await fetchFeatured()
  if (products.length === 0) return null

  const items = products.map(toSpotlight)
  return <ScentSpotlightClient items={items} />
}
