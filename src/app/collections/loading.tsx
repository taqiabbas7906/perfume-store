import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Collections index skeleton — mirrors the layout of
 * `src/app/collections/page.tsx`: cream banner header followed by a
 * three-up grid of tall portrait collection cards.
 */
export default function Loading() {
  return (
    <main className="pt-28 pb-20 bg-white min-h-screen">
      {/* Cream header band */}
      <div className="pt-4 pb-10 px-6 bg-[var(--color-cream-600)] border-b border-[var(--color-border-soft)]">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-px w-6" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-10 md:h-12 w-56 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>

      {/* Collection card grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden bg-[var(--color-cream-500)] border border-[var(--color-border-soft)]"
            >
              <div className="relative aspect-[4/5]">
                <Skeleton className="absolute inset-0 rounded-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

                {/* Bottom-overlay text block, mirrored from the real card */}
                <div className="absolute inset-x-0 bottom-0 p-5 space-y-2">
                  <Skeleton className="h-3 w-20 bg-white/40" />
                  <Skeleton className="h-7 w-3/4 bg-white/40" />
                  <Skeleton className="h-3 w-5/6 bg-white/30" />
                  <Skeleton className="h-3 w-2/3 bg-white/30" />
                  <Skeleton className="h-3 w-16 bg-white/40 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
