'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/api'
import { AdminTableSkeleton } from '@/components/ui/Skeleton'

type ReviewUser    = { _id: string; name: string; email: string }
type ReviewProduct = { _id: string; name: string; slug: string }

interface Review {
  _id: string
  user: ReviewUser
  product: ReviewProduct
  rating: number
  comment: string
  approved: boolean
  createdAt: string
}

type StatusFilter = 'pending' | 'approved' | 'all'

const STARS = [1, 2, 3, 4, 5]

export default function AdminReviewsPage() {
  const [reviews, setReviews]       = useState<Review[]>([])
  const [total, setTotal]           = useState(0)
  const [pages, setPages]           = useState(1)
  const [page, setPage]             = useState(1)
  const [status, setStatus]         = useState<StatusFilter>('pending')
  const [loading, setLoading]       = useState(true)
  const [actionId, setActionId]     = useState<string | null>(null)

  const load = useCallback(async (s: StatusFilter, p: number) => {
    setLoading(true)
    try {
      const res  = await authFetch(`/api/admin/reviews?status=${s}&page=${p}&limit=20`)
      const data = await res.json()
      if (data.success) {
        setReviews(data.reviews)
        setTotal(data.total)
        setPages(data.pages)
        setPage(p)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(status, 1) }, [status, load])

  async function setApproval(id: string, approved: boolean) {
    setActionId(id)
    try {
      const res = await authFetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      if (res.ok) {
        setReviews(prev =>
          status === 'all'
            ? prev.map(r => r._id === id ? { ...r, approved } : r)
            : prev.filter(r => r._id !== id)
        )
        setTotal(prev => Math.max(0, status === 'all' ? prev : prev - 1))
      }
    } finally {
      setActionId(null)
    }
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review permanently?')) return
    setActionId(id)
    try {
      const res = await authFetch(`/api/reviews/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setReviews(prev => prev.filter(r => r._id !== id))
        setTotal(prev => Math.max(0, prev - 1))
      }
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <AdminTableSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Admin</Link>
          <h1 className="text-2xl font-bold mt-1">Review Moderation</h1>
        </div>
        <span className="text-sm text-gray-500">{total} review{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {(['pending', 'approved', 'all'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`pb-3 px-4 text-sm font-medium capitalize border-b-2 transition-colors ${
              status === s
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No {status} reviews</div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div
              key={review._id}
              className={`border rounded-lg p-5 ${review.approved ? 'bg-green-50 border-green-200' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    {/* Stars */}
                    <span className="text-amber-400 text-sm">
                      {STARS.map(s => (
                        <span key={s}>{s <= review.rating ? '★' : '☆'}</span>
                      ))}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      review.approved
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {review.approved ? 'Approved' : 'Pending'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-gray-800 mb-3 leading-relaxed">{review.comment}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      <span className="font-medium text-gray-700">{review.user?.name ?? 'Unknown'}</span>
                      {' '}({review.user?.email})
                    </span>
                    <span>on</span>
                    <Link
                      href={`/products/${review.product?.slug ?? ''}`}
                      className="font-medium text-gray-700 hover:underline"
                      target="_blank"
                    >
                      {review.product?.name ?? 'Unknown product'}
                    </Link>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  {!review.approved && (
                    <button
                      onClick={() => setApproval(review._id, true)}
                      disabled={actionId === review._id}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      Approve
                    </button>
                  )}
                  {review.approved && (
                    <button
                      onClick={() => setApproval(review._id, false)}
                      disabled={actionId === review._id}
                      className="px-3 py-1.5 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 font-medium"
                    >
                      Unapprove
                    </button>
                  )}
                  <button
                    onClick={() => deleteReview(review._id)}
                    disabled={actionId === review._id}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => load(status, page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {page} / {pages}
          </span>
          <button
            onClick={() => load(status, page + 1)}
            disabled={page >= pages}
            className="px-4 py-2 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
