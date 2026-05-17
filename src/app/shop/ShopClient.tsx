'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ShopFilters from '@/components/sections/shop/ShopFilters'
import ShopGrid from '@/components/sections/shop/ShopGrid'
import type {
  StorefrontBrand,
  StorefrontCategory,
  StorefrontProduct,
  StorefrontPagination,
} from '@/types/storefront'

const DEFAULT_MAX = 1000

function ShopClientInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const category = searchParams.get('category') ?? ''
  const brand = searchParams.get('brand') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const search = searchParams.get('search') ?? ''
  const minPrice = Number(searchParams.get('minPrice') ?? 0)
  const maxPrice = Number(searchParams.get('maxPrice') ?? DEFAULT_MAX)
  const page = Number(searchParams.get('page') ?? 1)

  const [searchInput, setSearchInput] = useState(search)
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [pagination, setPagination] = useState<StorefrontPagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<StorefrontCategory[]>([])
  const [brands, setBrands] = useState<StorefrontBrand[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const updateParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === '' || value == null) {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      }
      const qs = params.toString()
      router.replace(`/shop${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router, searchParams],
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/categories').then((r) => r.json()).catch(() => null),
      fetch('/api/brands').then((r) => r.json()).catch(() => null),
    ]).then(([catData, brandData]) => {
      if (cancelled) return
      if (catData?.success) setCategories(catData.categories ?? [])
      if (brandData?.success) setBrands(brandData.brands ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    const qs = new URLSearchParams()
    qs.set('sort', sort)
    qs.set('limit', '24')
    qs.set('page', String(page || 1))
    if (category) qs.set('category', category)
    if (brand) qs.set('brand', brand)
    if (search) qs.set('search', search)
    if (minPrice > 0) qs.set('minPrice', String(minPrice))
    if (maxPrice > 0 && maxPrice < DEFAULT_MAX)
      qs.set('maxPrice', String(maxPrice))

    fetch(`/api/products?${qs.toString()}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setProducts(data.products ?? [])
          setPagination(data.pagination ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => ac.abort()
  }, [category, brand, sort, search, minPrice, maxPrice, page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ search: searchInput || null, page: null })
  }

  const clearAll = () => router.replace('/shop', { scroll: false })

  const hasFilters = useMemo(
    () =>
      category ||
      brand ||
      search ||
      sort !== 'newest' ||
      minPrice > 0 ||
      (maxPrice > 0 && maxPrice < DEFAULT_MAX),
    [category, brand, search, sort, minPrice, maxPrice],
  )

  return (
    <>
      <div className="pt-32 pb-10 px-6 bg-[var(--color-cream-600)] border-b border-[var(--color-border-soft)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
            <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
              Collection
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)] mb-2">
            Shop All Fragrances
          </h1>
          <p className="text-sm text-gray-500 font-light">
            {pagination ? `${pagination.total} products` : 'Loading…'}
            {search && (
              <span className="text-[var(--color-gold)] ml-2">
                for &quot;{search}&quot;
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="border-b border-[var(--color-border-soft)] bg-white px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 flex items-center gap-3 border border-[var(--color-border)] px-4 py-2.5 focus-within:border-[var(--color-gold)] transition-colors"
          >
            <i className="ri-search-line text-[var(--color-gold)] text-sm" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search fragrances, brands..."
              className="flex-1 text-sm text-[var(--color-ink)] placeholder-gray-300 outline-none bg-transparent"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  updateParams({ search: null, page: null })
                }}
                className="text-gray-300 hover:text-[var(--color-ink)] transition-colors"
              >
                <i className="ri-close-circle-line text-sm" />
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden flex items-center gap-2 border border-[var(--color-border)] px-4 py-2.5 text-[11px] tracking-widest uppercase font-semibold text-[var(--color-ink)] hover:border-[var(--color-gold)] transition-colors whitespace-nowrap"
          >
            <i className="ri-filter-3-line" />
            Filters
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="hidden lg:flex items-center gap-2 text-[10px] tracking-widest uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors whitespace-nowrap"
            >
              <i className="ri-close-line" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-10 items-start">
          <div className="hidden lg:block">
            <ShopFilters
              category={category}
              setCategory={(c) => updateParams({ category: c, page: null })}
              brand={brand}
              setBrand={(b) => updateParams({ brand: b, page: null })}
              minPrice={minPrice}
              maxPrice={maxPrice}
              setPriceRange={({ min, max }) =>
                updateParams({
                  minPrice: min || null,
                  maxPrice: max === DEFAULT_MAX ? null : max,
                  page: null,
                })
              }
              sort={sort}
              setSort={(s) => updateParams({ sort: s, page: null })}
              categories={categories}
              brands={brands}
            />
          </div>

          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-black/30"
                onClick={() => setFiltersOpen(false)}
              />
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-white px-5 py-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-sm font-semibold text-[var(--color-ink)] tracking-wide">
                    Filters
                  </p>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="w-7 h-7 flex items-center justify-center text-gray-400"
                    aria-label="Close filters"
                  >
                    <i className="ri-close-line text-lg" />
                  </button>
                </div>
                <ShopFilters
                  category={category}
                  setCategory={(c) => updateParams({ category: c, page: null })}
                  brand={brand}
                  setBrand={(b) => updateParams({ brand: b, page: null })}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  setPriceRange={({ min, max }) =>
                    updateParams({
                      minPrice: min || null,
                      maxPrice: max === DEFAULT_MAX ? null : max,
                      page: null,
                    })
                  }
                  sort={sort}
                  setSort={(s) => updateParams({ sort: s, page: null })}
                  categories={categories}
                  brands={brands}
                />
              </div>
            </div>
          )}

          <div className="flex-1">
            <ShopGrid products={products} loading={loading} />

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    updateParams({ page: Math.max(1, pagination.page - 1) })
                  }
                  className="text-xs tracking-widest uppercase font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 border border-[var(--color-border)]"
                >
                  ← Prev
                </button>
                <span className="text-xs tracking-widest uppercase text-gray-500 mx-2">
                  Page {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasMore}
                  onClick={() => updateParams({ page: pagination.page + 1 })}
                  className="text-xs tracking-widest uppercase font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 border border-[var(--color-border)]"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function ShopClient() {
  return (
    <Suspense fallback={<div className="pt-40 text-center text-gray-400">Loading…</div>}>
      <ShopClientInner />
    </Suspense>
  )
}
