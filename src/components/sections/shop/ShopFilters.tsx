'use client'

import type { StorefrontBrand } from '@/types/storefront'

interface ShopFiltersProps {
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
  idPrefix?: string
}

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A → Z' },
]

const audienceOptions = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
]

export default function ShopFilters({
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
  idPrefix = 'shop-filters',
}: ShopFiltersProps) {
  const sortId = `${idPrefix}-sort`
  const minPriceId = `${idPrefix}-min-price`
  const maxPriceId = `${idPrefix}-max-price`

  return (
    <aside className="w-full lg:w-64 flex-shrink-0" aria-label="Shop filters">
      <div className="sticky top-24 space-y-8">
        <div>
          <label
            htmlFor={sortId}
            className="block text-[9px] tracking-[0.4em] uppercase font-bold text-[var(--color-ink)] mb-3"
          >
            Sort By
          </label>
          <div className="relative">
            <select
              id={sortId}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-[var(--color-border)] bg-white text-xs text-[var(--color-ink)] px-3 py-2.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-gold)] transition-colors"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <i className="ri-arrow-down-s-line text-[var(--color-gold)] text-sm" />
            </div>
          </div>
        </div>

        <fieldset>
          <legend className="text-[9px] tracking-[0.4em] uppercase font-bold text-[var(--color-ink)] mb-3">
            Category
          </legend>
          <div className="space-y-1.5">
            <FilterButton
              label="All"
              active={!category}
              onClick={() => setCategory('')}
            />
            {audienceOptions.map((opt) => (
              <FilterButton
                key={opt.value}
                label={opt.label}
                active={category === opt.value}
                onClick={() => setCategory(opt.value)}
              />
            ))}
          </div>
        </fieldset>

        {brands.length > 0 && (
          <fieldset>
            <legend className="text-[9px] tracking-[0.4em] uppercase font-bold text-[var(--color-ink)] mb-3">
              Brand
            </legend>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <FilterButton
                label="All Brands"
                active={!brand}
                onClick={() => setBrand('')}
              />
              {brands.map((b) => (
                <FilterButton
                  key={b._id}
                  label={b.name}
                  active={brand === b.name}
                  onClick={() => setBrand(b.name)}
                />
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="text-[9px] tracking-[0.4em] uppercase font-bold text-[var(--color-ink)] mb-3">
            Price Range
          </legend>
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <div className="flex-1 border border-[var(--color-border)] px-2 py-1.5 flex items-center gap-1">
                <span className="text-[10px] text-gray-400">$</span>
                <label htmlFor={minPriceId} className="sr-only">
                  Minimum price
                </label>
                <input
                  id={minPriceId}
                  type="number"
                  value={minPrice}
                  onChange={(e) =>
                    setPriceRange({ min: Number(e.target.value), max: maxPrice })
                  }
                  className="w-full text-xs text-[var(--color-ink)] outline-none bg-transparent"
                  min={0}
                />
              </div>
              <span className="text-[10px] text-gray-400">to</span>
              <div className="flex-1 border border-[var(--color-border)] px-2 py-1.5 flex items-center gap-1">
                <span className="text-[10px] text-gray-400">$</span>
                <label htmlFor={maxPriceId} className="sr-only">
                  Maximum price
                </label>
                <input
                  id={maxPriceId}
                  type="number"
                  value={maxPrice}
                  onChange={(e) =>
                    setPriceRange({ min: minPrice, max: Number(e.target.value) })
                  }
                  className="w-full text-xs text-[var(--color-ink)] outline-none bg-transparent"
                  min={0}
                />
              </div>
            </div>
            <button
              onClick={() => setPriceRange({ min: 0, max: 1000 })}
              className="text-[10px] text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors tracking-wider"
            >
              Reset price
            </button>
          </div>
        </fieldset>
      </div>
    </aside>
  )
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-all duration-200 capitalize ${
        active
          ? 'bg-[var(--color-gold)] text-white'
          : 'text-[var(--color-ink)] hover:bg-[var(--color-cream-300)] hover:text-[var(--color-gold)]'
      }`}
    >
      <span className="truncate">{label}</span>
      {active && <i className="ri-check-line text-xs" />}
    </button>
  )
}
