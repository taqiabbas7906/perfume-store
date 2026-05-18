import { OrderListSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <main className="min-h-screen pt-32 pb-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <PageHeaderSkeleton />
        <OrderListSkeleton />
      </div>
    </main>
  )
}
