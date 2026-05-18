'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'
import CartPanel from '@/components/commerce/CartPanel'
import SearchOverlay from '@/components/commerce/SearchOverlay'

const CHROMELESS_PREFIXES = ['/admin']

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/'
  const chromeless = CHROMELESS_PREFIXES.some((p) => pathname.startsWith(p))

  if (chromeless) return <>{children}</>

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
      <CartPanel />
      <SearchOverlay />
    </div>
  )
}
