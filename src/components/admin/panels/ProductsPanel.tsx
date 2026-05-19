'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/api'

/* ─── types ─────────────────────────────────────────────── */

type ProductType = 'perfume' | 'lipstick' | 'makeup' | 'skincare' | 'jewelry' | 'other'

interface ProductImage {
  url: string
  alt?: string
  isPrimary?: boolean
}

interface ProductVariant {
  sku: string
  label: string
  originalPrice: number
  discountedPrice?: number
  quantity: number
}

interface AdminProduct {
  _id: string
  name: string
  slug: string
  brand: string
  category: string
  productType: ProductType
  minPrice: number
  maxPrice: number
  totalStock: number
  active: boolean
  images: ProductImage[]
  variants: ProductVariant[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

/* ─── helpers ───────────────────────────────────────────── */

function primaryImage(p: AdminProduct): string {
  const primary = p.images.find((i) => i.isPrimary) ?? p.images[0]
  return (
    primary?.url ||
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=80&h=80&fit=crop'
  )
}

const PAGE_SIZE = 20

/* ─── component ─────────────────────────────────────────── */

export default function ProductsPanel() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | 'active' | 'inactive'>('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  })

  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<AdminProduct | null>(null)

  const markBusy = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })

  /* ─── fetch ─── */

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (search.trim()) params.set('search', search.trim())
      if (filterBrand) params.set('brand', filterBrand)
      if (filterStatus) params.set('status', filterStatus)

      const res = await authFetch(`/api/admin/products?${params.toString()}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load products')
      }
      setProducts(data.products as AdminProduct[])
      if (data.pagination) setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterBrand, filterStatus])

  useEffect(() => {
    const t = setTimeout(() => {
      loadProducts()
    }, 250)
    return () => clearTimeout(t)
  }, [loadProducts])

  /* Load the brand filter options from the distinct brand strings on
     existing products so the dropdown always matches what's filterable. */
  useEffect(() => {
    authFetch('/api/admin/products/brands')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.brands)) setBrands(d.brands as string[])
      })
      .catch(() => {})
  }, [])

  /* ─── row actions ─── */

  async function toggleActive(product: AdminProduct) {
    markBusy(product._id, true)
    try {
      const res = await authFetch(`/api/products/${product.slug}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !product.active }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status')
      }
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, active: !p.active } : p)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      markBusy(product._id, false)
    }
  }

  async function handleDelete(product: AdminProduct) {
    markBusy(product._id, true)
    try {
      const res = await authFetch(`/api/products/${product.slug}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete product')
      }
      setConfirmDelete(null)
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, active: false } : p)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      markBusy(product._id, false)
    }
  }

  /* ─── render ─── */

  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const end = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-charcoal-900">Products</h1>
          <p className="text-sm text-charcoal-500 mt-1">Manage your fragrance catalog</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line" />
          </span>
          New Product
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-paper-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-charcoal-400">
            <i className="ri-search-line" />
          </span>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-paper-50 border border-paper-300 pl-9 pr-4 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          />
        </div>
        <select
          value={filterBrand}
          onChange={(e) => {
            setFilterBrand(e.target.value)
            setPage(1)
          }}
          className="bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-700 rounded focus:outline-none focus:border-gold-400"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as '' | 'active' | 'inactive')
            setPage(1)
          }}
          className="bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-700 rounded focus:outline-none focus:border-gold-400"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-paper-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-50 border-b border-paper-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                      <i className="ri-loader-4-line animate-spin" />
                      Loading products…
                    </span>
                  </td>
                </tr>
              )}
              {!loading &&
                products.map((product) => {
                  const busy = busyIds.has(product._id)
                  const firstVariant = product.variants[0]
                  const showSale =
                    firstVariant?.discountedPrice != null &&
                    firstVariant.discountedPrice < firstVariant.originalPrice
                  return (
                    <tr
                      key={product._id}
                      className="border-b border-paper-100 last:border-0 hover:bg-paper-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={primaryImage(product)}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div>
                            <p className="font-medium text-charcoal-900">{product.name}</p>
                            <p className="text-xs text-charcoal-400 capitalize">
                              {product.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-charcoal-700">{product.brand}</td>
                      <td className="px-4 py-3">
                        {showSale ? (
                          <>
                            <span className="font-medium text-charcoal-900">
                              ${firstVariant.discountedPrice}
                            </span>
                            <span className="text-xs text-charcoal-400 line-through ml-1.5">
                              ${firstVariant.originalPrice}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-charcoal-900">
                            ${product.minPrice}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-charcoal-700">
                        {product.totalStock}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(product)}
                          disabled={busy}
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-50 ${
                            product.active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {product.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/products/${product.slug}/edit`}
                          className="inline-flex text-charcoal-500 hover:text-gold-600 transition-colors mr-3"
                          title="Edit"
                        >
                          <span className="w-5 h-5 flex items-center justify-center">
                            <i className="ri-edit-line" />
                          </span>
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(product)}
                          disabled={busy || !product.active}
                          className="text-charcoal-500 hover:text-red-500 transition-colors disabled:opacity-30"
                          title={product.active ? 'Delete (deactivate)' : 'Already inactive'}
                        >
                          <span className="w-5 h-5 flex items-center justify-center">
                            <i className="ri-delete-bin-line" />
                          </span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
              <i className="ri-search-line" />
            </div>
            <p className="text-sm text-charcoal-500">
              No products found matching your criteria.
            </p>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-paper-200 bg-paper-50/40">
            <p className="text-xs text-charcoal-500">
              Showing <span className="font-medium text-charcoal-700">{start}</span>–
              <span className="font-medium text-charcoal-700">{end}</span> of{' '}
              <span className="font-medium text-charcoal-700">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page <= 1}
                className="px-2 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                title="First"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-xs text-charcoal-700 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs text-charcoal-600">
                Page <span className="font-medium text-charcoal-900">{pagination.page}</span>{' '}
                of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs text-charcoal-700 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Next
              </button>
              <button
                onClick={() => setPage(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                title="Last"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-5">
              <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-2">
                Delete product?
              </h3>
              <p className="text-sm text-charcoal-600">
                <span className="font-medium">{confirmDelete.name}</span> will be
                deactivated and hidden from the storefront. You can re-activate it from
                this list at any time.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-paper-200">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={busyIds.has(confirmDelete._id)}
                className="text-sm text-charcoal-600 hover:text-charcoal-900 px-4 py-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={busyIds.has(confirmDelete._id)}
                className="bg-red-600 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {busyIds.has(confirmDelete._id) ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
