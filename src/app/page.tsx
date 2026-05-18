import { Suspense } from 'react'
import Hero from '@/components/sections/home/Hero'
import CategoryStrip from '@/components/sections/home/CategoryStrip'
import BestSellers from '@/components/sections/home/BestSellers'
import PromoBanner from '@/components/sections/home/PromoBanner'
import ScentSpotlight from '@/components/sections/home/ScentSpotlight'
import TopBrands from '@/components/sections/home/TopBrands'
import AboutBanner from '@/components/sections/home/AboutBanner'
import Testimonials from '@/components/sections/home/Testimonials'
import Newsletter from '@/components/sections/home/Newsletter'
import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'

function CategoryStripSkeleton() {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-10 space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-px w-10" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-[var(--color-border)] bg-white">
              <Skeleton className="h-[160px] md:h-[190px] w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function BestSellersSkeleton() {
  return (
    <section className="py-20 px-6 bg-[var(--color-cream-500)]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-64 max-w-full" />
          <Skeleton className="h-px w-10" />
        </div>
        <ProductGridSkeleton count={6} />
      </div>
    </section>
  )
}

function TopBrandsSkeleton() {
  return (
    <section className="py-20 px-6 bg-[var(--color-cream-500)]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-px w-10" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className={i === 0 ? 'h-[300px] md:col-span-2 md:row-span-2 md:h-full' : 'h-[180px] md:h-[220px]'}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Suspense fallback={<CategoryStripSkeleton />}>
        <CategoryStrip />
      </Suspense>
      <Suspense fallback={<BestSellersSkeleton />}>
        <BestSellers />
      </Suspense>
      <PromoBanner />
      <ScentSpotlight />
      <Suspense fallback={<TopBrandsSkeleton />}>
        <TopBrands />
      </Suspense>
      <AboutBanner />
      <Testimonials />
      <Newsletter />
    </main>
  )
}
