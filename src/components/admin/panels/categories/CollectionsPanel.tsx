'use client'

import { useEffect, useMemo, useState } from 'react'
import { authFetch } from '@/lib/api'

interface PopulatedProduct {
  _id: string
  name: string
  slug: string
  brand?: string
  minPrice?: number
  active?: boolean
  images?: { url: string; isPrimary?: boolean }[]
}

interface RawProduct {
  _id: string
  name: string
  slug: string
  brand: string
  minPrice?: number
  active?: boolean
  images?: { url: string; isPrimary?: boolean }[]
}

export interface AdminCollection {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  products: (string | PopulatedProduct)[]
  isLimitedEdition: boolean
  startsAt?: string
  endsAt?: string
  active: boolean
  sortOrder: number
}

interface Props {
  collections: AdminCollection[]
  loading: boolean
  onRefresh: () => void | Promise<void>
  onError: (message: string) => void
  onEdit: (collection: AdminCollection) => void
}

function imageOf(p: PopulatedProduct): string {
  const primary = p.images?.find((i) => i.isPrimary) ?? p.images?.[0]
  return (
    primary?.url ||
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=80&h=80&fit=crop'
  )
}

export default function CollectionsPanel({
  collections,
  loading,
  onRefresh,
  onError,
  onEdit,
}: Props) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<AdminCollection | null>(null)

  /* Product picker (server-side search) */
  const [addSearch, setAddSearch] = useState('')
  const [searchResults, setSearchResults] = useState<RawProduct[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  const filteredCollections = useMemo(
    () =>
      collections.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [collections, search],
  )

  const selected = useMemo(
    () =>
      selectedId
        ? collections.find((collection) => collection._id === selectedId) ?? null
        : null,
    [collections, selectedId],
  )

  const markBusy = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })

  function collectionProducts(c: AdminCollection): PopulatedProduct[] {
    return c.products.filter(
      (p): p is PopulatedProduct => typeof p === 'object' && p !== null,
    )
  }

  async function patchCollection(id: string, body: Record<string, unknown>) {
    const res = await authFetch(`/api/admin/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update collection')
    }
    return data.collection as AdminCollection
  }

  async function toggleCollectionActive(c: AdminCollection) {
    markBusy(c._id, true)
    try {
      await patchCollection(c._id, { active: !c.active })
      await onRefresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update collection')
    } finally {
      markBusy(c._id, false)
    }
  }

  async function deleteCollection(collection: AdminCollection) {
    markBusy(collection._id, true)
    try {
      const res = await authFetch(`/api/admin/collections/${collection._id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to delete collection')
      }
      setConfirmDelete(null)
      if (selectedId === collection._id) setSelectedId(null)
      await onRefresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete collection')
    } finally {
      markBusy(collection._id, false)
    }
  }

  async function removeProductFromCollection(productId: string) {
    if (!selected) return
    try {
      await patchCollection(selected._id, { removeProducts: [productId] })
      await onRefresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove product')
    }
  }

  /* Debounced product search for the picker */
  useEffect(() => {
    if (!showAddModal) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: '50', status: 'active' })
        if (addSearch.trim()) params.set('search', addSearch.trim())
        const res = await authFetch(`/api/admin/products?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.success && Array.isArray(data.products)) {
          setSearchResults(data.products as RawProduct[])
        }
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [addSearch, showAddModal])

  function openAddProducts() {
    setAddSearch('')
    setPicked(new Set())
    setSearchLoading(true)
    setShowAddModal(true)
  }

  function closeAddProducts() {
    setShowAddModal(false)
    setSearchLoading(false)
  }

  function togglePick(productId: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  async function addPickedToCollection() {
    if (!selected || picked.size === 0) return
    setAdding(true)
    try {
      await patchCollection(selected._id, { addProducts: Array.from(picked) })
      setPicked(new Set())
      closeAddProducts()
      await onRefresh()
      // Pick up the refreshed collection so its modal shows the new products.
      // We don't have the new value here; closing the inner modal triggers
      // a re-render from the parent's updated list. The detail modal stays
      // open with stale data until the user closes/reopens it — refresh it
      // by clearing & restoring `selected` once collections update.
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add products')
    } finally {
      setAdding(false)
    }
  }

  /* Product IDs already in the selected collection, for the picker filter. */
  const selectedProductIds = useMemo(() => {
    if (!selected) return new Set<string>()
    return new Set(
      selected.products.map((p) => (typeof p === 'string' ? p : p._id)),
    )
  }, [selected])

  const pickableResults = useMemo(
    () => searchResults.filter((p) => !selectedProductIds.has(p._id)),
    [searchResults, selectedProductIds],
  )

  return (
    <div>
      <div className="bg-white rounded-lg border border-paper-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-charcoal-400">
            <i className="ri-search-line" />
          </span>
          <input
            type="text"
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-paper-50 border border-paper-300 pl-9 pr-4 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-lg border border-paper-200">
          <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
            <i className="ri-loader-4-line animate-spin" />
            Loading collections…
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCollections.map((collection) => {
              const products = collectionProducts(collection)
              const busy = busyIds.has(collection._id)
              return (
                <div
                  key={collection._id}
                  onClick={() => setSelectedId(collection._id)}
                  className="group bg-white rounded-lg border border-paper-200 overflow-hidden hover:border-gold-300 transition-colors cursor-pointer"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-paper-100">
                    {collection.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={collection.image}
                        alt={collection.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-paper-400 text-3xl">
                        <i className="ri-image-line" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    {collection.isLimitedEdition && (
                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 font-medium bg-gold-500 text-white">
                          Limited
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCollectionActive(collection)
                        }}
                        disabled={busy}
                        className={`text-[10px] uppercase tracking-wider px-2.5 py-1 font-medium transition-colors disabled:opacity-50 ${
                          collection.active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {collection.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-serif text-base font-medium text-charcoal-900 group-hover:text-gold-700 transition-colors">
                        {collection.name}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-charcoal-400">
                          {products.length} products
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(collection)
                          }}
                          title="Edit collection"
                          aria-label={`Edit ${collection.name}`}
                          className="w-7 h-7 rounded border border-paper-200 text-charcoal-500 hover:text-charcoal-900 hover:border-gold-300 hover:bg-gold-50 transition-colors flex items-center justify-center"
                        >
                          <i className="ri-pencil-line" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(collection)
                          }}
                          disabled={busy}
                          title="Delete collection"
                          aria-label={`Delete ${collection.name}`}
                          className="w-7 h-7 rounded border border-paper-200 text-charcoal-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center disabled:opacity-50"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </div>
                    {collection.description && (
                      <p className="text-xs text-charcoal-500 leading-relaxed line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    {products.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex -space-x-1.5">
                          {products.slice(0, 4).map((p) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              key={p._id}
                              src={imageOf(p)}
                              alt={p.name}
                              className="w-6 h-6 rounded-full border border-white object-cover"
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-charcoal-400">
                          {products.length} items
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredCollections.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-paper-200">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
                <i className="ri-search-line" />
              </div>
              <p className="text-sm text-charcoal-500">
                {collections.length === 0
                  ? 'No collections yet. Create one with the “New Collection” button above.'
                  : 'No collections found matching your search.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selected && !showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-paper-200">
              <div className="flex items-center gap-3">
                {selected.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selected.image}
                    alt={selected.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-paper-100 flex items-center justify-center text-paper-400">
                    <i className="ri-image-line" />
                  </div>
                )}
                <div>
                  <h3 className="font-serif text-lg font-medium text-charcoal-900">
                    {selected.name}
                  </h3>
                  <p className="text-xs text-charcoal-400">
                    {collectionProducts(selected).length} products
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(selected)}
                  className="border border-paper-300 text-charcoal-700 text-xs uppercase tracking-wider px-4 py-2 hover:border-gold-300 hover:text-charcoal-900 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-pencil-line" />
                  </span>
                  Edit Collection
                </button>
                <button
                  onClick={openAddProducts}
                  className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-4 py-2 hover:bg-charcoal-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-add-line" />
                  </span>
                  Add Products
                </button>
                <button
                  onClick={() => setConfirmDelete(selected)}
                  className="border border-red-200 text-red-600 text-xs uppercase tracking-wider px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-delete-bin-line" />
                  </span>
                  Delete
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-charcoal-400 hover:text-charcoal-700 transition-colors"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-close-line" />
                  </span>
                </button>
              </div>
            </div>

            <div className="p-5">
              {collectionProducts(selected).length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
                    <i className="ri-shopping-bag-line" />
                  </div>
                  <p className="text-sm text-charcoal-500 mb-2">
                    No products in this collection yet.
                  </p>
                  <button
                    onClick={openAddProducts}
                    className="text-xs text-gold-700 hover:text-gold-800 transition-colors font-medium"
                  >
                    Add products now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {collectionProducts(selected).map((product) => (
                    <div
                      key={product._id}
                      className="flex items-center gap-3 p-3 bg-paper-50 rounded-lg"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageOf(product)}
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-charcoal-500">
                          {product.brand ?? '—'}
                          {product.minPrice != null ? ` · $${product.minPrice}` : ''}
                          {product.active === false ? ' · Inactive' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => removeProductFromCollection(product._id)}
                        className="text-charcoal-400 hover:text-red-500 transition-colors shrink-0"
                        title="Remove from collection"
                      >
                        <span className="w-5 h-5 flex items-center justify-center">
                          <i className="ri-close-line" />
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add-products modal */}
      {selected && showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-paper-200">
              <h3 className="font-serif text-lg font-medium text-charcoal-900">
                Add to {selected.name}
              </h3>
              <button
                onClick={closeAddProducts}
                className="text-charcoal-400 hover:text-charcoal-700 transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-close-line" />
                </span>
              </button>
            </div>
            <div className="p-5">
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-charcoal-400">
                  <i className="ri-search-line" />
                </span>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={addSearch}
                  onChange={(e) => {
                    setAddSearch(e.target.value)
                    setSearchLoading(true)
                  }}
                  className="w-full bg-paper-50 border border-paper-300 pl-9 pr-4 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                />
              </div>

              {searchLoading ? (
                <div className="text-center py-8 text-sm text-charcoal-500">
                  <i className="ri-loader-4-line animate-spin mr-2" />
                  Searching…
                </div>
              ) : pickableResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-charcoal-500">
                    No available products{addSearch ? ' matching that search' : ''}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {pickableResults.map((product) => (
                    <label
                      key={product._id}
                      className="flex items-center gap-3 p-3 bg-paper-50 rounded-lg cursor-pointer hover:bg-paper-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={picked.has(product._id)}
                        onChange={() => togglePick(product._id)}
                        className="w-4 h-4 accent-charcoal-900 shrink-0"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageOf(product as PopulatedProduct)}
                        alt={product.name}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-charcoal-500">
                          {product.brand}
                          {product.minPrice != null ? ` · $${product.minPrice}` : ''}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-paper-200">
              <button
                onClick={closeAddProducts}
                disabled={adding}
                className="text-sm text-charcoal-600 hover:text-charcoal-900 px-4 py-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addPickedToCollection}
                disabled={picked.size === 0 || adding}
                className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {adding
                  ? 'Adding…'
                  : `Add ${picked.size} Product${picked.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-5">
              <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-2">
                Delete collection?
              </h3>
              <p className="text-sm text-charcoal-600">
                <span className="font-medium">{confirmDelete.name}</span> will be
                permanently removed from the collections list.
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
                onClick={() => void deleteCollection(confirmDelete)}
                disabled={busyIds.has(confirmDelete._id)}
                className="bg-red-600 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {busyIds.has(confirmDelete._id) ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
