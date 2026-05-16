'use client'

import ProductCard from '@/components/commerce/ProductCard'
import type { StorefrontProduct } from '@/types/storefront'

export default function ShopGrid({
  products,
  loading,
}: {
  products: StorefrontProduct[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--color-cream-500)] aspect-[3/4] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 flex items-center justify-center border border-[var(--color-border)] rounded-full mb-5">
          <i className="ri-search-line text-2xl text-[var(--color-gold)]" />
        </div>
        <p className="text-[var(--color-ink)] font-medium tracking-wide">
          No fragrances found
        </p>
        <p className="text-gray-400 text-xs mt-1.5 tracking-wide">
          Try adjusting your filters
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </div>
  )
}
