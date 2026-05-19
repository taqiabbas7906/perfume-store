'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/api'

interface ProductImage {
  url: string
  alt?: string
  isPrimary?: boolean
}

interface AdminProduct {
  _id: string
  name: string
  brand: string
  category: string
  productType: string
  slug: string
  minPrice: number
  maxPrice: number
  tags?: string[]
  images?: ProductImage[]
  active: boolean
  totalStock: number
  updatedAt?: string
}

interface SearchSyncStatus {
  indexName: string
  algoliaConfigured: boolean
  counts: {
    activeProducts: number
    inactiveProducts: number
    totalProducts: number
  }
}

interface SyncResults {
  synced: number
  failed: number
  skipped: number
}

const PRODUCT_PREVIEW_LIMIT = 200

function primaryImage(product: AdminProduct) {
  const primary = product.images?.find((image) => image.isPrimary)
  return (primary ?? product.images?.[0])?.url ?? ''
}

function productNotes(product: AdminProduct) {
  const tags = product.tags?.filter(Boolean) ?? []
  if (tags.length > 0) return tags.slice(0, 3).join(', ')
  return [product.category, product.productType].filter(Boolean).join(', ')
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function SearchSyncPanel() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncComplete, setSyncComplete] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [status, setStatus] = useState<SearchSyncStatus | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState('')
  const [error, setError] = useState('')

  const loadSyncData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setError('')
    try {
      const [statusRes, productsRes] = await Promise.all([
        authFetch('/api/admin/algolia/sync'),
        authFetch(
          `/api/admin/products?status=active&limit=${PRODUCT_PREVIEW_LIMIT}`,
        ),
      ])
      const statusData = await statusRes.json()
      const productsData = await productsRes.json()

      if (!statusRes.ok || !statusData.success) {
        throw new Error(statusData.error || 'Failed to load sync status')
      }
      if (!productsRes.ok || !productsData.success) {
        throw new Error(productsData.error || 'Failed to load active products')
      }

      setStatus(statusData as SearchSyncStatus)
      setProducts((productsData.products ?? []) as AdminProduct[])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load search sync data',
      )
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      void loadSyncData()
    }, 250)
    return () => clearTimeout(t)
  }, [loadSyncData])

  async function handleSync() {
    setIsSyncing(true)
    setSyncProgress(12)
    setSyncComplete(false)
    setSyncResults(null)
    setError('')

    const progressTimer = window.setInterval(() => {
      setSyncProgress((prev) => Math.min(88, prev + 8))
    }, 400)

    try {
      const res = await authFetch('/api/admin/algolia/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync products')
      }

      window.clearInterval(progressTimer)
      setSyncProgress(100)
      setSyncComplete(true)
      setLastSyncedAt(new Date().toISOString())
      setSyncResults({
        synced: Number(data.indexed ?? 0),
        failed: 0,
        skipped: Math.max(
          0,
          (status?.counts.activeProducts ?? products.length) -
            Number(data.indexed ?? 0),
        ),
      })
      void loadSyncData(false)
    } catch (err) {
      window.clearInterval(progressTimer)
      setSyncProgress(0)
      setSyncComplete(false)
      setSyncResults({
        synced: 0,
        failed: status?.counts.activeProducts ?? products.length,
        skipped: 0,
      })
      setError(err instanceof Error ? err.message : 'Failed to sync products')
    } finally {
      setIsSyncing(false)
    }
  }

  function handleReindex() {
    void handleSync()
  }

  const activeProducts = status?.counts.activeProducts ?? products.length
  const indexedProducts = syncResults ? syncResults.synced : '-'
  const displayProducts = products

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-medium text-charcoal-900">
          Search Index Sync
        </h1>
        <p className="text-sm text-charcoal-500 mt-1">
          Bulk-sync all active products to the Algolia search index
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-paper-200 p-5">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 text-blue-700 mb-3">
            <i className="ri-database-2-line text-lg" />
          </div>
          <p className="text-2xl font-serif font-semibold text-charcoal-900">
            {loading ? '-' : activeProducts}
          </p>
          <p className="text-xs text-charcoal-500 mt-1">Active Products</p>
        </div>
        <div className="bg-white rounded-lg border border-paper-200 p-5">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-50 text-green-700 mb-3">
            <i className="ri-search-line text-lg" />
          </div>
          <p className="text-2xl font-serif font-semibold text-charcoal-900">
            {indexedProducts}
          </p>
          <p className="text-xs text-charcoal-500 mt-1">Indexed Products</p>
        </div>
        <div className="bg-white rounded-lg border border-paper-200 p-5">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-orange-50 text-orange-700 mb-3">
            <i className="ri-time-line text-lg" />
          </div>
          <p className="text-2xl font-serif font-semibold text-charcoal-900">
            {lastSyncedAt ? formatTime(lastSyncedAt) : '-'}
          </p>
          <p className="text-xs text-charcoal-500 mt-1">Last Synced</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700 text-lg leading-none"
          >
            x
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-paper-200 p-6 md:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gold-50 text-gold-700 shrink-0">
            <i className="ri-exchange-line text-xl" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-1">
              Bulk Product Sync
            </h3>
            <p className="text-sm text-charcoal-600 leading-relaxed">
              This will push all {activeProducts} active products to your Algolia
              search index. Each product will be indexed with its name, brand,
              category, tags, price, and description for instant search and filtering.
            </p>
            {status && (
              <p className="text-xs text-charcoal-400 mt-2">
                Index: {status.indexName}
                {!status.algoliaConfigured && ' - Algolia admin key is not configured'}
              </p>
            )}
          </div>
        </div>

        {isSyncing && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-charcoal-700">
                Syncing products...
              </span>
              <span className="text-sm font-semibold text-gold-700">
                {Math.round(syncProgress)}%
              </span>
            </div>
            <div className="w-full h-2 bg-paper-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(syncProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-charcoal-400 mt-2">
              Processing{' '}
              {Math.min(
                Math.ceil((syncProgress / 100) * activeProducts),
                activeProducts,
              )}{' '}
              of {activeProducts} products...
            </p>
          </div>
        )}

        {syncComplete && syncResults && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 flex items-center justify-center text-green-700">
                <i className="ri-check-line" />
              </span>
              <span className="text-sm font-semibold text-green-800">Sync Complete</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-green-800">
                  {syncResults.synced}
                </p>
                <p className="text-xs text-green-600">Successfully synced</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-red-700">
                  {syncResults.failed}
                </p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-charcoal-700">
                  {syncResults.skipped}
                </p>
                <p className="text-xs text-charcoal-500">Skipped</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleSync()}
            disabled={isSyncing || loading || !status?.algoliaConfigured}
            className={`text-xs uppercase tracking-wider px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              isSyncing || loading || !status?.algoliaConfigured
                ? 'bg-paper-200 text-charcoal-400 cursor-not-allowed'
                : 'bg-charcoal-900 text-white hover:bg-charcoal-800'
            }`}
          >
            {isSyncing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-loader-4-line animate-spin" />
                </span>
                Syncing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-refresh-line" />
                </span>
                Sync to Algolia
              </span>
            )}
          </button>
          {syncComplete && (
            <button
              onClick={handleReindex}
              disabled={isSyncing || !status?.algoliaConfigured}
              className="text-xs uppercase tracking-wider px-6 py-3 font-medium border border-paper-300 text-charcoal-700 hover:bg-paper-50 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              Re-index All
            </button>
          )}
          <button
            onClick={() => void loadSyncData()}
            disabled={loading || isSyncing}
            className="text-xs uppercase tracking-wider px-6 py-3 font-medium border border-paper-300 text-charcoal-700 hover:bg-paper-50 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg border border-paper-200 p-6">
        <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-4">
          Products Ready to Sync
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-50 border-b border-paper-200">
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Product
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Brand
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Price
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Notes
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                      <i className="ri-loader-4-line animate-spin" />
                      Loading products...
                    </span>
                  </td>
                </tr>
              )}
              {!loading &&
                displayProducts.map((product) => {
                  const image = primaryImage(product)
                  return (
                    <tr
                      key={product._id}
                      className="border-b border-paper-100 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          {image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={image}
                              alt={product.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-paper-100 text-paper-400 flex items-center justify-center">
                              <i className="ri-shopping-bag-line" />
                            </div>
                          )}
                          <span className="text-charcoal-900 font-medium">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-charcoal-600">
                        {product.brand}
                      </td>
                      <td className="px-3 py-2 text-charcoal-900 font-medium">
                        {formatMoney(product.minPrice)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-charcoal-500">
                          {productNotes(product)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] uppercase tracking-wider bg-green-50 text-green-700 px-2 py-0.5 rounded">
                          Ready
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        {!loading && displayProducts.length === 0 && (
          <div className="text-center py-10">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
              <i className="ri-search-line" />
            </div>
            <p className="text-sm text-charcoal-500">
              No active products are ready to sync.
            </p>
          </div>
        )}
        {!loading && activeProducts > displayProducts.length && (
          <p className="text-xs text-charcoal-400 mt-4">
            Showing the first {displayProducts.length} of {activeProducts} active
            products.
          </p>
        )}
      </div>
    </div>
  )
}
