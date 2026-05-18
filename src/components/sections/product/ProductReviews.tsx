'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Skeleton } from '@/components/ui/Skeleton'

interface ReviewUser {
  _id?: string
  name?: string
}

interface ApiReview {
  _id: string
  user?: ReviewUser
  rating: number
  comment?: string
  createdAt: string
  verified?: boolean
}

interface EligibilityState {
  canReview: boolean
  orderId: string | null
  review: {
    _id: string
    rating: number
    comment: string
    approved: boolean
    orderId: string
  } | null
}

interface ProductReviewsProps {
  productId: string
  ratingAverage: number
  ratingCount: number
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function ProductReviews({
  productId,
  ratingAverage,
  ratingCount,
}: ProductReviewsProps) {
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [loading, setLoading] = useState(true)
  const [helpfulIds, setHelpfulIds] = useState<string[]>([])
  const [eligibility, setEligibility] = useState<EligibilityState | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const loadReviews = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true)
      return fetch(`/api/reviews?productId=${productId}&limit=10`, { signal })
        .then((r) => r.json())
        .then((data) => {
          if (signal?.aborted) return
          if (data?.success) setReviews(data.reviews ?? [])
        })
        .catch(() => {})
        .finally(() => {
          if (!signal?.aborted) setLoading(false)
        })
    },
    [productId],
  )

  const loadEligibility = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setEligibility(null)
        return
      }
      try {
        const res = await authFetch(
          `/api/reviews/eligibility?productId=${productId}`,
          { signal },
        )
        const data = await res.json()
        if (signal?.aborted) return
        if (data?.success) {
          setEligibility({
            canReview: Boolean(data.canReview),
            orderId: data.orderId ?? null,
            review: data.review ?? null,
          })
        }
      } catch {
        /* ignore */
      }
    },
    [productId, user],
  )

  useEffect(() => {
    const ac = new AbortController()
    loadReviews(ac.signal)
    return () => ac.abort()
  }, [loadReviews])

  useEffect(() => {
    if (authLoading) return
    const ac = new AbortController()
    loadEligibility(ac.signal)
    return () => ac.abort()
  }, [authLoading, loadEligibility])

  if (loading && reviews.length === 0) {
    return (
      <section className="py-12 lg:py-16 border-t border-[var(--color-border-soft)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10 space-y-3">
            <Skeleton className="h-3 w-36 mx-auto" />
            <Skeleton className="h-8 w-64 mx-auto max-w-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            <div className="space-y-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 pb-6">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length
    return {
      star,
      count,
      pct: reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0,
    }
  })

  const toggleHelpful = (id: string) =>
    setHelpfulIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const hasExisting = Boolean(eligibility?.review)
  const showCta =
    Boolean(eligibility) && (hasExisting || eligibility?.canReview)

  async function handleAfterSubmit() {
    setFormOpen(false)
    await Promise.all([loadReviews(), loadEligibility()])
  }

  return (
    <section
      id="reviews"
      className="py-12 lg:py-16 border-t border-[var(--color-border-soft)]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[10px] text-[var(--color-gold)] tracking-[0.4em] uppercase font-bold mb-2">
            Customer Reviews
          </p>
          <h2 className="font-serif text-2xl font-bold text-[var(--color-ink)]">
            What People Are Saying
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-cream-100)] border border-[var(--color-border-soft)] p-6 text-center mb-6">
              <div className="text-5xl font-bold text-[var(--color-ink)] mb-2">
                {ratingAverage.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <i
                    key={i}
                    className={`text-sm ${
                      i < Math.floor(ratingAverage)
                        ? 'ri-star-fill text-[var(--color-gold)]'
                        : i < ratingAverage
                          ? 'ri-star-half-fill text-[var(--color-gold)]'
                          : 'ri-star-line text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400">{ratingCount} reviews</p>
            </div>

            <div className="flex flex-col gap-2">
              {ratingBreakdown.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 w-14 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i
                        key={i}
                        className={`text-[10px] ${
                          i < star
                            ? 'ri-star-fill text-[var(--color-gold)]'
                            : 'ri-star-line text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex-1 h-1.5 bg-[var(--color-border-soft)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-gold)] transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-7 text-right shrink-0">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            {showCta && (
              <ReviewCta
                mode={hasExisting ? 'edit' : 'create'}
                eligibility={eligibility!}
                productId={productId}
                open={formOpen}
                onToggle={() => setFormOpen((v) => !v)}
                onSubmitted={handleAfterSubmit}
              />
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                No reviews yet — be the first to share your thoughts.
              </p>
            ) : (
              reviews.map((review, idx) => (
                <div
                  key={review._id}
                  className="border-b border-[var(--color-border-soft)] pb-6 animate-fade-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/15 flex items-center justify-center text-[var(--color-gold-deep)] font-semibold flex-shrink-0">
                      {(review.user?.name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-sm font-semibold text-[var(--color-ink)]">
                            {review.user?.name || 'Anonymous'}
                          </span>
                          {review.verified && (
                            <span className="ml-2 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-medium tracking-wide">
                              Verified
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-1 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <i
                            key={i}
                            className={`text-xs ${
                              i < review.rating
                                ? 'ri-star-fill text-[var(--color-gold)]'
                                : 'ri-star-line text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-3">
                        <button
                          type="button"
                          onClick={() => toggleHelpful(review._id)}
                          className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 border transition-all duration-200 ${
                            helpfulIds.includes(review._id)
                              ? 'border-[var(--color-gold)] text-[var(--color-gold)] bg-[var(--color-cream-300)]'
                              : 'border-[var(--color-border)] text-gray-400 hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]'
                          }`}
                        >
                          <i
                            className={`${
                              helpfulIds.includes(review._id)
                                ? 'ri-thumb-up-fill'
                                : 'ri-thumb-up-line'
                            } text-xs`}
                          />
                          Helpful
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Review CTA + inline form ─── */

function ReviewCta({
  mode,
  eligibility,
  productId,
  open,
  onToggle,
  onSubmitted,
}: {
  mode: 'create' | 'edit'
  eligibility: EligibilityState
  productId: string
  open: boolean
  onToggle: () => void
  onSubmitted: () => Promise<void> | void
}) {
  const isEdit = mode === 'edit'
  const existing = eligibility.review
  const heading = isEdit ? 'Your review' : 'Share your experience'
  const subline = isEdit
    ? existing?.approved
      ? 'Your review is published. Update the rating or comment any time.'
      : 'Your review is pending moderation. You can still adjust the rating or comment.'
    : 'Thanks for purchasing — tell other shoppers what you thought.'
  const buttonLabel = isEdit
    ? open
      ? 'Close'
      : 'Edit your review'
    : open
      ? 'Close'
      : 'Write a review'

  return (
    <div className="bg-[var(--color-cream-100)] border border-[var(--color-border-soft)] p-5 mb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-[var(--color-gold)] tracking-[0.4em] uppercase font-bold mb-1.5 flex items-center gap-2">
            {isEdit ? (
              <>
                <i className="ri-edit-2-line" />
                Edit Review
              </>
            ) : (
              <>
                <i className="ri-star-line" />
                Verified Purchase
              </>
            )}
          </p>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {heading}
          </p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-md">
            {subline}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-white text-[10px] tracking-[0.25em] uppercase font-bold px-5 py-2.5 transition-all duration-300"
        >
          {buttonLabel}
        </button>
      </div>

      {open && (
        <ReviewForm
          mode={mode}
          productId={productId}
          orderId={eligibility.orderId}
          existingReviewId={existing?._id ?? null}
          initialRating={existing?.rating ?? 0}
          initialComment={existing?.comment ?? ''}
          onCancel={onToggle}
          onSubmitted={onSubmitted}
        />
      )}
    </div>
  )
}

function ReviewForm({
  mode,
  productId,
  orderId,
  existingReviewId,
  initialRating,
  initialComment,
  onCancel,
  onSubmitted,
}: {
  mode: 'create' | 'edit'
  productId: string
  orderId: string | null
  existingReviewId: string | null
  initialRating: number
  initialComment: string
  onCancel: () => void
  onSubmitted: () => Promise<void> | void
}) {
  const [rating, setRating] = useState(initialRating)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(initialComment)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = comment.trim()
  const valid =
    rating >= 1 &&
    rating <= 5 &&
    trimmed.length >= 10 &&
    trimmed.length <= 500

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    if (mode === 'create' && !orderId) {
      setError('No eligible order found for this product.')
      return
    }
    if (mode === 'edit' && !existingReviewId) {
      setError('Cannot find the review to edit.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res =
        mode === 'edit'
          ? await authFetch(`/api/reviews/${existingReviewId}`, {
              method: 'PUT',
              body: JSON.stringify({ rating, comment: trimmed }),
            })
          : await authFetch('/api/reviews', {
              method: 'POST',
              body: JSON.stringify({
                orderId,
                productId,
                rating,
                comment: trimmed,
              }),
            })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        setError(data?.error ?? 'Could not save review. Please try again.')
        return
      }
      await onSubmitted()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4 animate-fadeIn">
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2">
          Your rating
        </p>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                className="p-0.5 text-xl transition-transform hover:scale-110"
              >
                <i
                  className={
                    active
                      ? 'ri-star-fill text-[var(--color-gold)]'
                      : 'ri-star-line text-gray-300'
                  }
                />
              </button>
            )
          })}
          {rating > 0 && (
            <span className="ml-2 text-xs text-gray-500">{rating} of 5</span>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="product-review-comment"
          className="block text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2"
        >
          Your review
        </label>
        <textarea
          id="product-review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          minLength={10}
          maxLength={500}
          placeholder="What did you love about this product? (at least 10 characters)"
          className="w-full border border-[var(--color-border)] bg-white text-sm text-[var(--color-ink)] placeholder-gray-300 px-3 py-2.5 outline-none focus:border-[var(--color-gold)] transition-colors resize-y"
          required
        />
        <p className="text-[10px] text-gray-400 mt-1">
          {trimmed.length}/500 — edits go through moderation again.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!valid || submitting}
          className="bg-[var(--color-ink)] hover:bg-[var(--color-gold)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] tracking-[0.25em] uppercase font-bold px-8 py-3 transition-all duration-300"
        >
          {submitting
            ? 'Saving…'
            : mode === 'edit'
              ? 'Update Review'
              : 'Submit Review'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-[10px] tracking-[0.25em] uppercase font-semibold text-gray-400 hover:text-[var(--color-ink)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
