import { PageHeaderSkeleton, ProductGridSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <main className="min-h-screen pt-28 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <PageHeaderSkeleton />
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 flex-shrink-0 space-y-5">
            <div className="h-10 skeleton-shimmer bg-[var(--color-cream-400)]" />
            <div className="h-40 skeleton-shimmer bg-[var(--color-cream-400)]" />
            <div className="h-40 skeleton-shimmer bg-[var(--color-cream-400)]" />
          </aside>
          <div className="flex-1">
            <ProductGridSkeleton count={12} />
          </div>
        </div>
      </div>
    </main>
  )
}
