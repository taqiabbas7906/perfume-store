import { PageHeaderSkeleton, WishlistGridSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <main className="min-h-screen pt-32 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <PageHeaderSkeleton />
        <WishlistGridSkeleton />
      </div>
    </main>
  )
}
