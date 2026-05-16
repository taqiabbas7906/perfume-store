import type { Metadata } from 'next'
import ShopClient from './ShopClient'

export const metadata: Metadata = {
  title: 'Shop All Fragrances',
  description:
    'Browse our curated collection of niche and designer fragrances. Filter by brand, category, and price.',
}

export default function ShopPage() {
  return <ShopClient />
}
