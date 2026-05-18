import ProductCard from '@/components/commerce/ProductCard'
import type { StorefrontProduct } from '@/types/storefront'

interface RelatedProductsProps {
  currentSlug: string
  brand: string
  category?: string
  productType?: string
}

const HEADINGS: Record<string, { eyebrow: string; title: string }> = {
  perfume: { eyebrow: 'You May Also Like', title: 'Related Fragrances' },
  lipstick: { eyebrow: 'You May Also Like', title: 'Related Lipsticks' },
  makeup: { eyebrow: 'You May Also Like', title: 'Related Makeup' },
  jewelry: { eyebrow: 'You May Also Like', title: 'Related Pieces' },
  skincare: { eyebrow: 'You May Also Like', title: 'Related Skincare' },
}
const DEFAULT_HEADING = {
  eyebrow: 'You May Also Like',
  title: 'Related Products',
}

async function fetchRelated({
  currentSlug,
  brand,
  category,
}: Pick<
  RelatedProductsProps,
  'currentSlug' | 'brand' | 'category'
>): Promise<StorefrontProduct[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const qs = new URLSearchParams({ limit: '8', sort: 'popular' })
    if (brand) qs.set('brand', brand)
    const res = await fetch(`${base}/api/products?${qs.toString()}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    if (!data?.success) return []
    const filtered: StorefrontProduct[] = (data.products as StorefrontProduct[]).filter(
      (p) => p.slug !== currentSlug,
    )
    if (filtered.length >= 4) return filtered.slice(0, 8)
    // Fall back to category when not enough same-brand items
    if (category) {
      const r2 = await fetch(
        `${base}/api/products?category=${encodeURIComponent(category)}&limit=8&sort=popular`,
        { next: { revalidate: 60 } },
      )
      if (r2.ok) {
        const d2 = await r2.json()
        if (d2?.success) {
          const seen = new Set(filtered.map((p) => p._id))
          for (const p of d2.products as StorefrontProduct[]) {
            if (p.slug === currentSlug || seen.has(p._id)) continue
            filtered.push(p)
            seen.add(p._id)
            if (filtered.length >= 8) break
          }
        }
      }
    }
    return filtered.slice(0, 8)
  } catch {
    return []
  }
}

export default async function RelatedProducts(props: RelatedProductsProps) {
  const { productType } = props
  const products = await fetchRelated(props)
  if (products.length === 0) return null

  const heading =
    (productType && HEADINGS[productType]) || DEFAULT_HEADING

  return (
    <section className="py-12 lg:py-16 border-t border-[var(--color-border-soft)] bg-[var(--color-cream-100)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[10px] text-[var(--color-gold)] tracking-[0.4em] uppercase font-bold mb-2">
            {heading.eyebrow}
          </p>
          <h2 className="font-serif text-2xl font-bold text-[var(--color-ink)]">
            {heading.title}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}
