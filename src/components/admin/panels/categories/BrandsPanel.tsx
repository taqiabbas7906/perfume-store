'use client'

import { useMemo, useState } from 'react'
import { authFetch } from '@/lib/api'

export interface AdminBrand {
  _id: string
  name: string
  slug: string
  description?: string
  logo?: string
  website?: string
  country?: string
  isLuxury: boolean
  active: boolean
  sortOrder: number
  productCount?: number
}

interface Props {
  brands: AdminBrand[]
  loading: boolean
  onRefresh: () => void | Promise<void>
  onError: (message: string) => void
  onEdit: (brand: AdminBrand) => void
}

export default function BrandsPanel({
  brands,
  loading,
  onRefresh,
  onError,
  onEdit,
}: Props) {
  const [search, setSearch] = useState('')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<AdminBrand | null>(null)

  const filtered = useMemo(
    () =>
      brands.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          (b.country ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [brands, search],
  )

  const markBusy = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })

  async function toggleBrandActive(brand: AdminBrand) {
    markBusy(brand._id, true)
    try {
      const res = await authFetch(`/api/admin/brands/${brand._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !brand.active }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update brand')
      }
      await onRefresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update brand')
    } finally {
      markBusy(brand._id, false)
    }
  }

  async function deleteBrand(brand: AdminBrand) {
    markBusy(brand._id, true)
    try {
      const res = await authFetch(`/api/admin/brands/${brand._id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to delete brand')
      }
      setConfirmDelete(null)
      await onRefresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete brand')
    } finally {
      markBusy(brand._id, false)
    }
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-paper-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-charcoal-400">
            <i className="ri-search-line" />
          </span>
          <input
            type="text"
            placeholder="Search brands..."
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
            Loading brands…
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((brand) => {
              const busy = busyIds.has(brand._id)
              return (
                <div
                  key={brand._id}
                  className="group bg-white rounded-lg border border-paper-200 overflow-hidden hover:border-gold-300 transition-colors"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-paper-100">
                    {brand.logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-300 text-2xl font-serif">
                        {brand.name}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    {brand.isLuxury && (
                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 font-medium bg-gold-500 text-white rounded-sm">
                          Luxury
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => toggleBrandActive(brand)}
                        disabled={busy}
                        className={`text-[10px] uppercase tracking-wider px-2.5 py-1 font-medium transition-colors disabled:opacity-50 rounded-sm ${
                          brand.active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {brand.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-serif text-base font-medium text-charcoal-900 group-hover:text-gold-700 transition-colors truncate">
                        {brand.name}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {brand.productCount != null && (
                          <span className="text-xs text-charcoal-400">
                            {brand.productCount} product
                            {brand.productCount === 1 ? '' : 's'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(brand)}
                          title="Edit brand"
                          aria-label={`Edit ${brand.name}`}
                          className="w-7 h-7 rounded border border-paper-200 text-charcoal-500 hover:text-charcoal-900 hover:border-gold-300 hover:bg-gold-50 transition-colors flex items-center justify-center"
                        >
                          <i className="ri-pencil-line" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(brand)}
                          disabled={busy}
                          title="Delete brand"
                          aria-label={`Delete ${brand.name}`}
                          className="w-7 h-7 rounded border border-paper-200 text-charcoal-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center disabled:opacity-50"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </div>
                    {(brand.country || brand.website) && (
                      <p className="text-xs text-charcoal-500 mb-1.5 flex items-center gap-1.5">
                        {brand.country && <span>{brand.country}</span>}
                        {brand.country && brand.website && (
                          <span className="text-paper-400">·</span>
                        )}
                        {brand.website && (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gold-700 hover:text-gold-800 truncate"
                          >
                            {brand.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </p>
                    )}
                    {brand.description && (
                      <p className="text-xs text-charcoal-500 leading-relaxed line-clamp-2">
                        {brand.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-paper-200">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
                <i className="ri-search-line" />
              </div>
              <p className="text-sm text-charcoal-500">
                {brands.length === 0
                  ? 'No brands yet. Create one with the “New Brand” button above.'
                  : 'No brands found matching your search.'}
              </p>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-5">
              <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-2">
                Delete brand?
              </h3>
              <p className="text-sm text-charcoal-600">
                <span className="font-medium">{confirmDelete.name}</span> will be
                permanently removed from the brands list.
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
                onClick={() => void deleteBrand(confirmDelete)}
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
