'use client'

import ShopFilters from './ShopFilters'
import type { StorefrontBrand } from '@/types/storefront'

interface MobileFiltersDrawerProps {
  open: boolean
  onClose: () => void
  category: string
  setCategory: (c: string) => void
  brand: string
  setBrand: (b: string) => void
  minPrice: number
  maxPrice: number
  setPriceRange: (range: { min: number; max: number }) => void
  sort: string
  setSort: (s: string) => void
  brands: StorefrontBrand[]
}

export default function MobileFiltersDrawer({
  open,
  onClose,
  category,
  setCategory,
  brand,
  setBrand,
  minPrice,
  maxPrice,
  setPriceRange,
  sort,
  setSort,
  brands,
}: MobileFiltersDrawerProps) {
  if (!open) return null

  return (
    <aside className="lg:hidden fixed inset-0 z-50" aria-label="Product filters">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close filters"
      />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white px-5 py-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm font-semibold text-[var(--color-ink)] tracking-wide">
            Filters
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400"
            aria-label="Close filters"
          >
            <i className="ri-close-line text-lg" aria-hidden="true" />
          </button>
        </div>
        <ShopFilters
          idPrefix="shop-mobile-filters"
          category={category}
          setCategory={setCategory}
          brand={brand}
          setBrand={setBrand}
          minPrice={minPrice}
          maxPrice={maxPrice}
          setPriceRange={setPriceRange}
          sort={sort}
          setSort={setSort}
          brands={brands}
        />
      </div>
    </aside>
  )
}
