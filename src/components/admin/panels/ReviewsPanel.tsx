'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/api'

type ReviewFilter = 'all' | 'pending' | 'approved'

interface ReviewUser {
  _id?: string
  name?: string
  email?: string
}

interface ReviewProductImage {
  url: string
  alt?: string
  isPrimary?: boolean
}

interface ReviewProduct {
  _id?: string
  name?: string
  slug?: string
  brand?: string
  images?: ReviewProductImage[]
  ratingAverage?: number
  ratingCount?: number
}

interface ReviewOrder {
  _id?: string
  status?: string
  totalAmount?: number
  createdAt?: string
}

interface AdminReview {
  _id: string
  user?: ReviewUser | string | null
  product?: ReviewProduct | string | null
  order?: ReviewOrder | string | null
  rating: number
  comment: string
  approved: boolean
  createdAt: string
  updatedAt?: string
}

interface Counts {
  all: number
  pending: number
  approved: number
}

const PAGE_SIZE = 20

function emptyCounts(): Counts {
  return { all: 0, pending: 0, approved: 0 }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className="w-3.5 h-3.5 flex items-center justify-center">
          <i
            className={`${
              star <= Math.floor(rating) ? 'ri-star-fill' : 'ri-star-line'
            } text-gold-500 text-xs`}
          />
        </span>
      ))}
    </div>
  )
}

function userName(review: AdminReview) {
  if (review.user && typeof review.user === 'object') {
    return review.user.name || 'Customer'
  }
  return 'Customer'
}

function userEmail(review: AdminReview) {
  if (review.user && typeof review.user === 'object') {
    return review.user.email || 'No email'
  }
  return 'No email'
}

function productName(review: AdminReview) {
  if (review.product && typeof review.product === 'object') {
    return review.product.name || 'Product'
  }
  return 'Product'
}

function productSlug(review: AdminReview) {
  if (review.product && typeof review.product === 'object') {
    return review.product.slug
  }
  return undefined
}

function productBrand(review: AdminReview) {
  if (review.product && typeof review.product === 'object') {
    return review.product.brand
  }
  return undefined
}

function productImage(review: AdminReview) {
  if (!review.product || typeof review.product !== 'object') return ''
  const primary = review.product.images?.find((image) => image.isPrimary)
  return (primary ?? review.product.images?.[0])?.url ?? ''
}

function orderId(review: AdminReview) {
  if (review.order && typeof review.order === 'object') {
    return review.order._id
  }
  return typeof review.order === 'string' ? review.order : undefined
}

function orderNumber(id?: string) {
  return id ? `#${id.slice(-8).toUpperCase()}` : '-'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'C'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatMoney(value?: number) {
  if (typeof value !== 'number') return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function ReviewsPanel() {
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [counts, setCounts] = useState<Counts>(emptyCounts)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<AdminReview | null>(null)

  const loadReviews = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          status: filter,
          page: String(page),
          limit: String(PAGE_SIZE),
        })
        if (search.trim()) params.set('q', search.trim())

        const res = await authFetch(`/api/admin/reviews?${params.toString()}`)
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load reviews')
        }

        setReviews((data.reviews ?? []) as AdminReview[])
        setCounts({ ...emptyCounts(), ...(data.counts ?? {}) })
        setTotal(data.total ?? 0)
        setPages(Math.max(1, data.pages ?? 1))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews')
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [filter, page, search],
  )

  useEffect(() => {
    const t = setTimeout(() => {
      void loadReviews()
    }, 250)
    return () => clearTimeout(t)
  }, [loadReviews])

  function markBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function syncReview(review: AdminReview) {
    setSelectedReview((current) =>
      current?._id === review._id ? { ...current, ...review } : current,
    )
    setReviews((prev) =>
      prev.map((candidate) =>
        candidate._id === review._id ? { ...candidate, ...review } : candidate,
      ),
    )
  }

  async function openReviewDetail(review: AdminReview) {
    setSelectedReview(review)
    setDetailLoading(true)
    setError('')
    try {
      const res = await authFetch(`/api/reviews/${review._id}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load review details')
      }
      setSelectedReview(data.review as AdminReview)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load review details',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  async function setApproved(review: AdminReview, approved: boolean) {
    markBusy(review._id, true)
    setError('')
    try {
      const res = await authFetch(`/api/reviews/${review._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ approved }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update review')
      }
      syncReview({ ...review, approved })
      void loadReviews(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review')
    } finally {
      markBusy(review._id, false)
    }
  }

  async function deleteReview(review: AdminReview) {
    markBusy(review._id, true)
    setError('')
    try {
      const res = await authFetch(`/api/reviews/${review._id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete review')
      }
      setConfirmDelete(null)
      setSelectedReview(null)
      setReviews((prev) => prev.filter((candidate) => candidate._id !== review._id))
      void loadReviews(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review')
    } finally {
      markBusy(review._id, false)
    }
  }

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-medium text-charcoal-900">
          Reviews
        </h1>
        <p className="text-sm text-charcoal-500 mt-1">
          Manage and approve customer reviews
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['all', 'pending', 'approved'] as ReviewFilter[]).map((nextFilter) => (
          <button
            key={nextFilter}
            onClick={() => {
              setFilter(nextFilter)
              setPage(1)
            }}
            className={`bg-white rounded-lg border p-4 text-center transition-colors ${
              filter === nextFilter
                ? 'border-gold-400 bg-gold-50'
                : 'border-paper-200 hover:border-paper-300'
            }`}
          >
            <p className="text-xl font-serif font-semibold text-charcoal-900">
              {counts[nextFilter]}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
              {nextFilter === 'all' ? 'All Reviews' : nextFilter}
            </p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-paper-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-charcoal-400">
            <i className="ri-search-line" />
          </span>
          <input
            type="text"
            placeholder="Search reviews, products, customers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-paper-50 border border-paper-300 pl-9 pr-4 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as ReviewFilter)
            setPage(1)
          }}
          className="bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-700 rounded focus:outline-none focus:border-gold-400"
        >
          <option value="all">All Reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
        <button
          onClick={() => void loadReviews()}
          disabled={loading}
          className="border border-paper-300 text-charcoal-700 text-xs uppercase tracking-wider px-4 py-2 hover:border-gold-300 hover:text-charcoal-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className={loading ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} />
          </span>
          Refresh
        </button>
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

      <div className="bg-white rounded-lg border border-paper-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-50 border-b border-paper-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Comment</th>
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
                      Loading reviews...
                    </span>
                  </td>
                </tr>
              )}
              {!loading &&
                reviews.map((review) => {
                  const busy = busyIds.has(review._id)
                  const image = productImage(review)
                  return (
                    <tr
                      key={review._id}
                      className="border-b border-paper-100 last:border-0 hover:bg-paper-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={image}
                              alt={productName(review)}
                              className="w-9 h-9 rounded object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-paper-100 text-paper-400 flex items-center justify-center">
                              <i className="ri-shopping-bag-line" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-charcoal-900">
                              {productName(review)}
                            </p>
                            {productBrand(review) && (
                              <p className="text-xs text-charcoal-400">
                                {productBrand(review)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-charcoal-900">{userName(review)}</p>
                        <p className="text-xs text-charcoal-400">
                          {userEmail(review)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StarRating rating={review.rating} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-charcoal-600 max-w-xs truncate">
                          {review.comment}
                        </p>
                        <p className="text-xs text-charcoal-400 mt-0.5">
                          {formatDate(review.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${
                            review.approved
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {review.approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => void openReviewDetail(review)}
                          className="text-xs text-gold-700 hover:text-gold-800 font-medium mr-3 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => void setApproved(review, !review.approved)}
                          disabled={busy}
                          className={`text-xs font-medium transition-colors disabled:opacity-50 ${
                            review.approved
                              ? 'text-red-500 hover:text-red-600'
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {review.approved ? 'Reject' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {!loading && reviews.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
              <i className="ri-star-line" />
            </div>
            <p className="text-sm text-charcoal-500">
              No reviews found in this category.
            </p>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-paper-200 bg-paper-50/40">
            <p className="text-xs text-charcoal-500">
              Showing <span className="font-medium text-charcoal-700">{start}</span>-
              <span className="font-medium text-charcoal-700">{end}</span> of{' '}
              <span className="font-medium text-charcoal-700">{total}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs text-charcoal-700 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs text-charcoal-600">
                Page <span className="font-medium text-charcoal-900">{page}</span>{' '}
                of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1.5 text-xs text-charcoal-700 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Next
              </button>
              <button
                onClick={() => setPage(pages)}
                disabled={page >= pages}
                className="px-2 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-paper-200">
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-400">
                  Review Detail
                </p>
                <h3 className="font-serif text-lg font-medium text-charcoal-900">
                  {productName(selectedReview)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-charcoal-400 hover:text-charcoal-700 transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-close-line" />
                </span>
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                  <i className="ri-loader-4-line animate-spin" />
                  Loading review details...
                </span>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center font-semibold">
                        {initials(userName(selectedReview))}
                      </div>
                      <div>
                        <p className="font-medium text-charcoal-900">
                          {userName(selectedReview)}
                        </p>
                        <p className="text-xs text-charcoal-400">
                          {userEmail(selectedReview)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <StarRating rating={selectedReview.rating} />
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${
                          selectedReview.approved
                            ? 'bg-green-50 text-green-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {selectedReview.approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal-700 leading-relaxed bg-paper-50 rounded p-4">
                      {selectedReview.comment}
                    </p>
                  </section>

                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Product
                    </h4>
                    <div className="flex items-center gap-3">
                      {productImage(selectedReview) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={productImage(selectedReview)}
                          alt={productName(selectedReview)}
                          className="w-14 h-14 rounded object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded bg-paper-100 text-paper-400 flex items-center justify-center">
                          <i className="ri-shopping-bag-line" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-charcoal-900">
                          {productName(selectedReview)}
                        </p>
                        <p className="text-xs text-charcoal-500">
                          {[productBrand(selectedReview), productSlug(selectedReview)]
                            .filter(Boolean)
                            .join(' · ') || 'Product details'}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Review Info
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-charcoal-500 mb-1">Submitted</p>
                        <p className="text-charcoal-900">
                          {formatDate(selectedReview.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-charcoal-500 mb-1">Updated</p>
                        <p className="text-charcoal-900">
                          {formatDate(selectedReview.updatedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-charcoal-500 mb-1">Order</p>
                        <p className="text-charcoal-900">
                          {orderNumber(orderId(selectedReview))}
                        </p>
                        {selectedReview.order &&
                          typeof selectedReview.order === 'object' && (
                            <p className="text-xs text-charcoal-500">
                              {selectedReview.order.status ?? 'order'} ·{' '}
                              {formatMoney(selectedReview.order.totalAmount)}
                            </p>
                          )}
                      </div>
                    </div>
                  </section>

                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Moderation
                    </h4>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => void setApproved(selectedReview, true)}
                        disabled={busyIds.has(selectedReview._id) || selectedReview.approved}
                        className="bg-green-50 text-green-700 text-xs uppercase tracking-wider px-4 py-2.5 hover:bg-green-100 transition-colors disabled:opacity-40"
                      >
                        Approve Review
                      </button>
                      <button
                        onClick={() => void setApproved(selectedReview, false)}
                        disabled={busyIds.has(selectedReview._id) || !selectedReview.approved}
                        className="bg-red-50 text-red-700 text-xs uppercase tracking-wider px-4 py-2.5 hover:bg-red-100 transition-colors disabled:opacity-40"
                      >
                        Reject Review
                      </button>
                      <button
                        onClick={() => setConfirmDelete(selectedReview)}
                        disabled={busyIds.has(selectedReview._id)}
                        className="border border-paper-300 text-charcoal-700 text-xs uppercase tracking-wider px-4 py-2.5 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        Delete Review
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-5">
              <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-2">
                Delete review?
              </h3>
              <p className="text-sm text-charcoal-600">
                This removes the review permanently and recalculates the product rating.
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
                onClick={() => void deleteReview(confirmDelete)}
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
