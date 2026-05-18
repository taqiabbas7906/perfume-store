type SkeletonProps = {
  className?: string
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('skeleton-shimmer bg-[var(--color-cream-400)]', className)}
    />
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-px w-6" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-12 w-56 max-w-full" />
      <Skeleton className="mt-4 h-4 w-40" />
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function WishlistGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

export function CartItemsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-5 border-b border-[var(--color-border-soft)] pb-6 last:border-0"
        >
          <Skeleton className="h-28 w-24 flex-shrink-0" />
          <div className="flex-1 space-y-3 min-w-0">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-28" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function CartPageSkeleton() {
  return (
    <main className="min-h-screen pt-32 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <CartItemsSkeleton count={4} />
          </div>
          <div className="bg-[var(--color-cream-50)] border border-[var(--color-border)] p-6 space-y-5">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </main>
  )
}

export function CartPanelSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-[var(--color-cream-400)] pb-5 last:border-0"
        >
          <Skeleton className="h-24 w-20 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-24" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function CheckoutSkeleton() {
  return (
    <main className="min-h-screen pt-32 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <section key={i} className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </section>
            ))}
          </div>
          <aside className="bg-[var(--color-cream-50)] border border-[var(--color-border)] p-6 space-y-5">
            <Skeleton className="h-6 w-36" />
            <CartItemsSkeleton count={2} />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-12 w-full" />
          </aside>
        </div>
      </div>
    </main>
  )
}

export function OrderListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-[var(--color-cream-400)] bg-white">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="flex items-center gap-5">
            <Skeleton className="hidden sm:block h-4 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function OrderDetailSkeleton() {
  return (
    <main className="min-h-screen pt-32 pb-20 bg-white">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <CartItemsSkeleton count={3} />
        <Skeleton className="h-40 w-full" />
      </div>
    </main>
  )
}

export function AccountOverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <OrderListSkeleton count={3} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  )
}

export function AccountShellSkeleton() {
  return (
    <main className="bg-[var(--color-cream-600)] min-h-screen">
      <div className="pt-32 pb-8 px-6 bg-white border-b border-[var(--color-border-soft)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-px w-6" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex items-center gap-5">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-7 w-64 max-w-[70vw]" />
              <Skeleton className="h-3 w-48 max-w-[65vw]" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white border-b border-[var(--color-border-soft)] px-6">
        <div className="max-w-7xl mx-auto flex gap-5 py-4 overflow-hidden">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <AccountOverviewSkeleton />
      </div>
    </main>
  )
}

export function LoginPageSkeleton() {
  return (
    <main className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block bg-[var(--color-cream-500)]">
        <Skeleton className="h-full min-h-screen w-full" />
      </div>
      <div className="flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    </main>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-8 h-9 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-6 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-4 gap-4 bg-gray-50 px-4 py-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-4 border-t border-gray-100 px-4 py-4"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <main className="min-h-screen pt-28 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-4">
            <Skeleton className="aspect-[4/5] w-full" />
          </div>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-px w-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </main>
  )
}

export function SearchResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-16 w-14 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
