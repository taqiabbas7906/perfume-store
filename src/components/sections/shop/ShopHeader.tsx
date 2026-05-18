import { Skeleton } from '@/components/ui/Skeleton'
import type { StorefrontPagination } from '@/types/storefront'

interface ShopHeaderProps {
  pagination: StorefrontPagination | null
  search: string
}

export default function ShopHeader({ pagination, search }: ShopHeaderProps) {
  return (
    <section className="pt-32 pb-10 px-6 bg-[var(--color-cream-600)] border-b border-[var(--color-border-soft)]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
          <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
            Collection
          </span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)] mb-2">
          Shop All Products
        </h1>
        <div className="text-sm text-gray-500 font-light">
          {pagination ? (
            `${pagination.total} products`
          ) : (
            <Skeleton className="inline-block h-4 w-24 align-middle" />
          )}
          {search && (
            <span className="text-[var(--color-gold)] ml-2">
              for &quot;{search}&quot;
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
