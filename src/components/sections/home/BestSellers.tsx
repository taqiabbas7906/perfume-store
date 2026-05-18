import Link from 'next/link'
import ProductCard from '@/components/commerce/ProductCard'
import type {
  StorefrontProduct,
  StorefrontProductListResponse,
} from '@/types/storefront'

export const dynamic = 'force-dynamic'

async function fetchBestSellers(): Promise<StorefrontProduct[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(
      `${base}/api/products?featured=true&limit=6&sort=popular`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as StorefrontProductListResponse
    if (data?.success) return data.products
    return []
  } catch {
    return []
  }
}

export default async function BestSellers() {
  const products = await fetchBestSellers()

  return (
    <section id="shop" className="py-20 px-6 bg-[var(--color-cream-500)]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-semibold mb-2">
              Top Picks
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)]">
              Best Sellers
            </h2>
            <div className="w-10 h-[1px] bg-[var(--color-gold)] mt-4" />
          </div>
          <Link
            href="/shop"
            className="flex items-center gap-2 text-[11px] tracking-widest uppercase font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors whitespace-nowrap group"
          >
            View All Products
            <i className="ri-arrow-right-line transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm tracking-wide">
            Our best sellers are loading — please check back shortly.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
            {products.map((p, i) => (
              <ProductCard
                key={p._id}
                product={p}
                badge={i === 0 ? 'BESTSELLER' : undefined}
                priority={i < 2}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-14">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-3 max-w-full border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-white text-[11px] tracking-[0.2em] sm:tracking-[0.25em] uppercase font-bold px-8 sm:px-16 py-4 transition-all duration-300 whitespace-nowrap group"
          >
            Browse Full Collection
            <i className="ri-arrow-right-line transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
