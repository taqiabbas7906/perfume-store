import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Homepage skeleton — mirrors the visible structure of `src/app/page.tsx`:
 *   Hero  →  CategoryStrip ("Find Your Signature Scent")  →  BestSellers
 *
 * Sections below the fold (Promo, Spotlight, TopBrands, AboutBanner,
 * Testimonials, Newsletter) are each wrapped in their own Suspense at
 * render time, so the loader only needs to cover the first viewport.
 */
export default function Loading() {
  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative w-full h-[80vh] min-h-[560px] overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-cream-200)]/95 via-[var(--color-cream-200)]/60 to-transparent" />
        <div className="relative h-full flex flex-col justify-center px-8 md:px-20 lg:px-32">
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-px w-8" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-16 md:h-20 w-3/4" />
            <Skeleton className="h-16 md:h-20 w-2/3" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-4 w-60 max-w-full" />
            <div className="flex flex-wrap gap-3 pt-3">
              <Skeleton className="h-12 w-44" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </div>
      </section>

      {/* Find Your Signature Scent — 4 audience cards */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-10 space-y-3">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-9 w-64 max-w-full" />
            <Skeleton className="h-px w-10" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="border border-[var(--color-border)] bg-white overflow-hidden"
              >
                <Skeleton className="h-[160px] md:h-[190px] w-full rounded-none" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers — 6-up product grid */}
      <section className="py-20 px-6 bg-[var(--color-cream-500)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 md:h-12 w-64 max-w-full" />
              <Skeleton className="h-px w-10" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Skeleton className="inline-block h-12 w-72 max-w-full" />
          </div>
        </div>
      </section>
    </main>
  )
}
