'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MobileFiltersDrawer from '@/components/sections/shop/MobileFiltersDrawer'
import ShopFilters from '@/components/sections/shop/ShopFilters'
import ShopGrid from '@/components/sections/shop/ShopGrid'
import ShopHeader from '@/components/sections/shop/ShopHeader'
import ShopPagination from '@/components/sections/shop/ShopPagination'
import ShopToolbar from '@/components/sections/shop/ShopToolbar'
import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton'
import type {
  StorefrontBrand,
  StorefrontPagination,
  StorefrontProduct,
} from '@/types/storefront'

const DEFAULT_MAX = 1000

function ShopShellSkeleton() {
  return (
    <>
      <section className="pt-32 pb-10 px-6 bg-[var(--color-cream-600)] border-b border-[var(--color-border-soft)]">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-px w-6" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-10 items-start">
          <aside className="hidden lg:block w-64 flex-shrink-0 space-y-5">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </aside>
          <div className="flex-1">
            <ProductGridSkeleton count={8} />
          </div>
        </div>
      </section>
    </>
  )
}

function ShopClientInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // `audience` filters by Product.tags (men/women/unisex tag on each product).
  // Backend's `category` field stores fragrance categories like
  // "eau de parfum", not audience, so we use the tag filter for it.
  const audience = searchParams.get('audience') ?? ''
  const brand = searchParams.get('brand') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const search = searchParams.get('search') ?? ''
  const minPrice = Number(searchParams.get('minPrice') ?? 0)
  const maxPrice = Number(searchParams.get('maxPrice') ?? DEFAULT_MAX)
  const page = Number(searchParams.get('page') ?? 1)

  const [searchInput, setSearchInput] = useState(search)
  const [productState, setProductState] = useState<{
    query: string
    products: StorefrontProduct[]
    pagination: StorefrontPagination | null
  }>({ query: '', products: [], pagination: null })
  const [brands, setBrands] = useState<StorefrontBrand[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const productQuery = useMemo(() => {
    const qs = new URLSearchParams()
    qs.set('sort', sort)
    qs.set('limit', '24')
    qs.set('page', String(page || 1))
    if (audience) qs.set('tag', audience)
    if (brand) qs.set('brand', brand)
    if (search) qs.set('search', search)
    if (minPrice > 0) qs.set('minPrice', String(minPrice))
    if (maxPrice > 0 && maxPrice < DEFAULT_MAX) {
      qs.set('maxPrice', String(maxPrice))
    }
    return qs.toString()
  }, [audience, brand, maxPrice, minPrice, page, search, sort])

  const products = productState.products
  const pagination = productState.pagination
  const loading = productState.query !== productQuery

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
    fetch('/api/brands')
      .then((r) => r.json())
      .then((brandData) => {
        if (cancelled) return
        if (brandData?.success) setBrands(brandData.brands ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()

    fetch(`/api/products?${productQuery}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setProductState({
            query: productQuery,
            products: data.products ?? [],
            pagination: data.pagination ?? null,
          })
        } else {
          setProductState({ query: productQuery, products: [], pagination: null })
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setProductState({ query: productQuery, products: [], pagination: null })
        }
      })

    return () => ac.abort()
  }, [productQuery])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ search: searchInput || null, page: null })
  }

  const clearAll = () => {
    setSearchInput('')
    router.replace('/shop', { scroll: false })
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        audience ||
          brand ||
          search ||
          sort !== 'newest' ||
          minPrice > 0 ||
          (maxPrice > 0 && maxPrice < DEFAULT_MAX),
      ),
    [audience, brand, search, sort, minPrice, maxPrice],
  )

  const filterProps = {
    category: audience,
    setCategory: (c: string) => updateParams({ audience: c, page: null }),
    brand,
    setBrand: (b: string) => updateParams({ brand: b, page: null }),
    minPrice,
    maxPrice,
    setPriceRange: ({ min, max }: { min: number; max: number }) =>
      updateParams({
        minPrice: min || null,
        maxPrice: max === DEFAULT_MAX ? null : max,
        page: null,
      }),
    sort,
    setSort: (s: string) => updateParams({ sort: s, page: null }),
    brands,
  }

  return (
    <main>
      <ShopHeader pagination={pagination} search={search} />

      <ShopToolbar
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        hasFilters={hasFilters}
        onSubmit={handleSearchSubmit}
        onClearSearch={() => {
          setSearchInput('')
          updateParams({ search: null, page: null })
        }}
        onClearAll={clearAll}
        onOpenFilters={() => setFiltersOpen(!filtersOpen)}
      />

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-10 items-start">
          <div className="hidden lg:block">
            <ShopFilters {...filterProps} idPrefix="shop-desktop-filters" />
          </div>

          <MobileFiltersDrawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            {...filterProps}
          />

          <section className="flex-1" aria-label="Products">
            <ShopGrid products={products} loading={loading} />
            <ShopPagination
              pagination={pagination}
              onPageChange={(nextPage) => updateParams({ page: nextPage })}
            />
          </section>
        </div>
      </section>
    </main>
  )
}

export default function ShopClient() {
  return (
    <Suspense
      fallback={
        <main>
          <ShopShellSkeleton />
        </main>
      }
    >
      <ShopClientInner />
    </Suspense>
  )
}
