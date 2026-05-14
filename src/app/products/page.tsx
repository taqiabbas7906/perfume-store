'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  brand: string
  category: string
  minPrice: number
  maxPrice: number
  images: Array<{ url: string; alt?: string }>
  variants: Array<{ sku: string; label: string; originalPrice: number; discountedPrice?: number; quantity: number }>
}

interface Category {
  _id: string
  name: string
  slug: string
}

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc',   label: 'Name: A → Z' },
  { value: 'name_desc',  label: 'Name: Z → A' },
  { value: 'rating',     label: 'Top rated' },
  { value: 'popular',    label: 'Most popular' },
] as const

export default function ProductsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const sort     = searchParams.get('sort')     ?? 'newest'
  const category = searchParams.get('category') ?? ''
  const search   = searchParams.get('search')   ?? ''

  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  /* ── Update a single query-param, preserving the others ── */
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else       params.delete(key)
    router.replace(`/products?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  /* ── Load categories once ── */
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.categories) })
      .catch(() => {})
  }, [])

  /* ── Refetch products whenever filters change ── */
  useEffect(() => {
    setLoading(true)
    setError('')

    const qs = new URLSearchParams()
    qs.set('sort', sort)
    if (category) qs.set('category', category)
    if (search)   qs.set('search', search)

    fetch(`/api/products?${qs.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setProducts(d.products)
        else           setError(d.error || 'Failed to load products')
      })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false))
  }, [sort, category, search])

  const clearFilters = () => router.replace('/products', { scroll: false })
  const hasActiveFilter = !!(category || search || sort !== 'newest')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Our Products</h1>

        {/* Filter / Sort bar */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={category}
              onChange={e => updateParam('category', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-40"
            >
              <option value="">All categories</option>
              {categories.map(c => (
                <option key={c._id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sort by</label>
            <select
              value={sort}
              onChange={e => updateParam('sort', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-45"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active search chip */}
      {search && (
        <p className="mb-4 text-sm text-gray-500">
          Showing results for <span className="font-medium text-gray-900">&ldquo;{search}&rdquo;</span>
        </p>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : error ? (
        <div className="py-8 text-center text-red-500">{error}</div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-4xl mb-2">🌫️</p>
          <p className="text-sm">No products match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const hasDiscount = product.variants.some(v =>
              v.discountedPrice && v.discountedPrice < v.originalPrice
            )

            const discountPercentages = product.variants
              .filter(v => v.discountedPrice && v.discountedPrice < v.originalPrice)
              .map(v => Math.round(((v.originalPrice - v.discountedPrice!) / v.originalPrice) * 100))

            const maxDiscount = discountPercentages.length > 0 ? Math.max(...discountPercentages) : 0

            const discountedPrices = product.variants.map(v => v.discountedPrice ?? v.originalPrice)
            const minDiscountedPrice = Math.min(...discountedPrices)
            const maxDiscountedPrice = Math.max(...discountedPrices)

            const originalPrices = product.variants.map(v => v.originalPrice)
            const minOriginalPrice = Math.min(...originalPrices)
            const maxOriginalPrice = Math.max(...originalPrices)

            return (
              <Link
                key={product._id}
                href={`/products/${product.slug}`}
                className="border rounded-lg overflow-hidden hover:shadow-lg hover:scale-105 transition duration-200"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400">No image</span>
                  )}

                  {hasDiscount && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      {maxDiscount}% OFF
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500">{product.brand}</p>
                  <h2 className="text-lg font-semibold mb-1">{product.name}</h2>

                  <div className="space-y-1">
                    <p className="text-lg font-bold text-green-600">
                      ${minDiscountedPrice.toFixed(2)}
                      {maxDiscountedPrice > minDiscountedPrice && ` - $${maxDiscountedPrice.toFixed(2)}`}
                    </p>

                    {hasDiscount && (
                      <p className="text-sm text-gray-500 line-through">
                        ${minOriginalPrice.toFixed(2)}
                        {maxOriginalPrice > minOriginalPrice && ` - $${maxOriginalPrice.toFixed(2)}`}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
