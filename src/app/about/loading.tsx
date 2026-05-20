import { Skeleton } from '@/components/ui/Skeleton'

/**
 * About page skeleton — mirrors `src/app/about/page.tsx`:
 *   Hero  →  Story (2-column with stat row)  →  Core Values (3 cards)
 *   →  Meet Our Team (4 portrait cards)
 */
export default function Loading() {
  return (
    <main>
      {/* Hero */}
      <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fdf8f2]/95 via-[#fdf8f2]/70 to-[#fdf8f2]/20" />
        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-20 lg:px-32">
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-px w-8" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-16 md:h-20 w-3/5" />
            <Skeleton className="h-16 md:h-20 w-4/5" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
      </section>

      {/* Story — image + text side-by-side, stat row underneath */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            {/* Mock the gold accent card hanging off the corner */}
            <div className="absolute -bottom-6 -right-6 hidden md:block bg-[var(--color-gold)]/20 p-7 w-32 h-24" />
          </div>

          <div className="space-y-5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 md:h-12 w-3/4" />
            <Skeleton className="h-10 md:h-12 w-2/3" />
            <div className="space-y-3 pt-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-10/12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-9/12" />
            </div>

            {/* 3-up stat row */}
            <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-[var(--color-border-soft)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Values — 3 cards on cream */}
      <section className="py-24 px-6 bg-[var(--color-cream-600)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 flex flex-col items-center space-y-3">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-10 md:h-12 w-72 max-w-full" />
            <Skeleton className="h-px w-10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <article key={i} className="bg-white p-8 space-y-5">
                <Skeleton className="h-12 w-12 rounded-none" />
                <Skeleton className="h-5 w-40" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Our Team — 4 portrait cards */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 flex flex-col items-center space-y-3">
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-10 md:h-12 w-64 max-w-full" />
            <Skeleton className="h-px w-10" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <article key={i} className="text-center">
                <Skeleton className="aspect-[3/4] w-full mb-5 rounded-none" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-3 w-1/2 mx-auto mt-2" />
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-3 w-11/12 mx-auto" />
                  <Skeleton className="h-3 w-4/5 mx-auto" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
