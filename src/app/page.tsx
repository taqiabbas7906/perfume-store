import Hero from '@/components/sections/home/Hero'
import CategoryStrip from '@/components/sections/home/CategoryStrip'
import BestSellers from '@/components/sections/home/BestSellers'
import PromoBanner from '@/components/sections/home/PromoBanner'
import ScentSpotlight from '@/components/sections/home/ScentSpotlight'
import TopBrands from '@/components/sections/home/TopBrands'
import AboutBanner from '@/components/sections/home/AboutBanner'
import Testimonials from '@/components/sections/home/Testimonials'
import Newsletter from '@/components/sections/home/Newsletter'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <BestSellers />
      <PromoBanner />
      <ScentSpotlight />
      <TopBrands />
      <AboutBanner />
      <Testimonials />
      <Newsletter />
    </>
  )
}
