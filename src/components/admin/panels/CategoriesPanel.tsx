'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/api'
import CollectionsPanel, {
  type AdminCollection,
} from './categories/CollectionsPanel'
import BrandsPanel, { type AdminBrand } from './categories/BrandsPanel'
import NewCollectionModal from './categories/NewCollectionModal'
import NewBrandModal from './categories/NewBrandModal'

type Tab = 'collections' | 'brands'

export default function CategoriesPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('collections')

  const [collections, setCollections] = useState<AdminCollection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [brands, setBrands] = useState<AdminBrand[]>([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [error, setError] = useState('')

  const [showNewCollection, setShowNewCollection] = useState(false)
  const [editingCollection, setEditingCollection] =
    useState<AdminCollection | null>(null)
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [editingBrand, setEditingBrand] = useState<AdminBrand | null>(null)

  /* ─── fetchers ─── */

  const readCollections = useCallback(async () => {
    const res = await authFetch('/api/admin/collections?populate=true')
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load collections')
    }
    return data.collections as AdminCollection[]
  }, [])

  const readBrands = useCallback(async () => {
    const res = await authFetch('/api/admin/brands')
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load brands')
    }
    return data.brands as AdminBrand[]
  }, [])

  const refreshCollections = useCallback(async () => {
    setCollectionsLoading(true)
    try {
      setCollections(await readCollections())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections')
    } finally {
      setCollectionsLoading(false)
    }
  }, [readCollections])

  const refreshBrands = useCallback(async () => {
    setBrandsLoading(true)
    try {
      setBrands(await readBrands())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brands')
    } finally {
      setBrandsLoading(false)
    }
  }, [readBrands])

  /* Initial parallel load. */
  useEffect(() => {
    let cancelled = false

    Promise.allSettled([readCollections(), readBrands()]).then((results) => {
      if (cancelled) return
      const [colResult, brandResult] = results
      if (colResult.status === 'fulfilled') {
        setCollections(colResult.value)
      } else {
        setError(
          colResult.reason instanceof Error
            ? colResult.reason.message
            : 'Failed to load collections',
        )
      }
      if (brandResult.status === 'fulfilled') {
        setBrands(brandResult.value)
      } else if (colResult.status === 'fulfilled') {
        // Don't overwrite the collection error if both failed.
        setError(
          brandResult.reason instanceof Error
            ? brandResult.reason.message
            : 'Failed to load brands',
        )
      }
      setCollectionsLoading(false)
      setBrandsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [readCollections, readBrands])

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-charcoal-900">
            Categories
          </h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Manage collections and brands
          </p>
        </div>
        {activeTab === 'collections' ? (
          <button
            onClick={() => setShowNewCollection(true)}
            className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-add-line" />
            </span>
            New Collection
          </button>
        ) : (
          <button
            onClick={() => setShowNewBrand(true)}
            className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-add-line" />
            </span>
            New Brand
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-paper-200 p-1 mb-6 inline-flex">
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'collections'
              ? 'bg-charcoal-900 text-white'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-apps-line" />
            </span>
            Collections
          </span>
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'brands'
              ? 'bg-charcoal-900 text-white'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-building-line" />
            </span>
            Brands
          </span>
        </button>
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

      {activeTab === 'collections' ? (
        <CollectionsPanel
          collections={collections}
          loading={collectionsLoading}
          onRefresh={refreshCollections}
          onError={setError}
          onEdit={setEditingCollection}
        />
      ) : (
        <BrandsPanel
          brands={brands}
          loading={brandsLoading}
          onRefresh={refreshBrands}
          onError={setError}
          onEdit={setEditingBrand}
        />
      )}

      {showNewCollection && (
        <NewCollectionModal
          onClose={() => setShowNewCollection(false)}
          onSaved={() => {
            setShowNewCollection(false)
            void refreshCollections()
          }}
          onError={setError}
        />
      )}

      {editingCollection && (
        <NewCollectionModal
          initial={editingCollection}
          onClose={() => setEditingCollection(null)}
          onSaved={() => {
            setEditingCollection(null)
            void refreshCollections()
          }}
          onError={setError}
        />
      )}

      {showNewBrand && (
        <NewBrandModal
          onClose={() => setShowNewBrand(false)}
          onSaved={() => {
            setShowNewBrand(false)
            void refreshBrands()
          }}
          onError={setError}
        />
      )}

      {editingBrand && (
        <NewBrandModal
          initial={editingBrand}
          onClose={() => setEditingBrand(null)}
          onSaved={() => {
            setEditingBrand(null)
            void refreshBrands()
          }}
          onError={setError}
        />
      )}
    </div>
  )
}
