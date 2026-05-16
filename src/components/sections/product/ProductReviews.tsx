'use client'

import { useEffect, useState } from 'react'

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
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [loading, setLoading] = useState(true)
  const [helpfulIds, setHelpfulIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/reviews?productId=${productId}&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          setReviews(data.reviews ?? [])
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [productId])

  if (loading && reviews.length === 0) {
    return null
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
