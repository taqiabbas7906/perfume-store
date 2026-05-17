'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { smartFetch, authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

/* ─── Types ─── */
interface Variant { sku: string; label: string; originalPrice: number; discountedPrice?: number; quantity: number }

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  brand: string
  category: string
  ratingAverage: number
  ratingCount: number
  images: Array<{ url: string; alt?: string }>
  variants: Variant[]
}

interface Review {
  _id: string
  user: { _id: string; name: string }
  rating: number
  comment: string
  createdAt: string
}

interface EligibleOrder { _id: string; createdAt: string; status: string }

/* ─── Star display ─── */
function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'text-xl' : 'text-sm'
  return (
    <span className={sz}>
      {[1,2,3,4,5].map(n => (
        <span key={n} className={n <= Math.round(value) ? 'text-amber-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  )
}

/* ─── Interactive star picker ─── */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl leading-none transition-colors ${n <= (hover || value) ? 'text-amber-400' : 'text-gray-200'}`}
        >★</button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */

export default function ProductDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const [product, setProduct]           = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [quantity, setQuantity]         = useState(1)
  const [loading, setLoading]           = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')

  /* wishlist */
  const [inWishlist, setInWishlist]         = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  /* reviews */
  const [reviews, setReviews]               = useState<Review[]>([])
  const [reviewTotal, setReviewTotal]       = useState(0)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([])
  const [showForm, setShowForm]             = useState(false)
  const [reviewRating, setReviewRating]     = useState(5)
  const [reviewComment, setReviewComment]   = useState('')
  const [reviewOrderId, setReviewOrderId]   = useState('')
  const [submitting, setSubmitting]         = useState(false)
  const [reviewError, setReviewError]       = useState('')
  const [reviewSuccess, setReviewSuccess]   = useState('')

  /* ── load product ── */
  useEffect(() => {
    if (!slug) return
    fetch(`/api/products/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProduct(d.product)
          setSelectedVariant(d.product.variants[0]?.sku ?? null)
        } else {
          setError(d.error || 'Product not found')
        }
      })
      .catch(() => setError('Failed to load product'))
      .finally(() => setLoading(false))
  }, [slug])

  /* ── load reviews ── */
  useEffect(() => {
    if (!product) return
    setReviewsLoading(true)
    fetch(`/api/reviews?productId=${product._id}&limit=10`)
      .then(r => r.json())
      .then(d => {
        if (d.reviews) {
          setReviews(d.reviews)
          setReviewTotal(d.pagination?.total ?? d.reviews.length)
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }, [product])

  /* ── wishlist status + eligible orders ── */
  useEffect(() => {
    if (!user || !product) return

    authFetch('/api/wishlist')
      .then(r => r.json())
      .then(d => {
        if (d.items) {
          setInWishlist(d.items.some((i: { productId: { _id?: string } | string }) => {
            const pid = typeof i.productId === 'object' ? i.productId?._id : i.productId
            return pid === product._id
          }))
        }
      })
      .catch(() => {})

    authFetch('/api/orders')
      .then(r => r.json())
      .then(d => {
        if (d.orders) {
          const eligible: EligibleOrder[] = d.orders.filter((o: { status: string; items?: { productId: string }[] }) =>
            ['paid', 'shipped', 'delivered'].includes(o.status) &&
            o.items?.some(i => i.productId === product._id || String(i.productId) === product._id)
          )
          setEligibleOrders(eligible)
          if (eligible.length) setReviewOrderId(eligible[0]._id)
        }
      })
      .catch(() => {})
  }, [user, product])

  /* ── handlers ── */
  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return
    setAddingToCart(true); setError(''); setSuccess('')
    try {
      const res = await smartFetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product._id, variantSku: selectedVariant, quantity }),
      })
      const data = await res.json()
      if (data.success) setSuccess('Added to cart!')
      else setError(data.error || 'Failed to add to cart')
    } catch { setError('Failed to add to cart') }
    finally { setAddingToCart(false) }
  }

  const toggleWishlist = async () => {
    if (!user) { router.push('/login'); return }
    setWishlistLoading(true)
    try {
      if (inWishlist) {
        await authFetch(`/api/wishlist/${product!._id}`, { method: 'DELETE' })
        setInWishlist(false)
      } else {
        await authFetch('/api/wishlist', {
          method: 'POST',
          body: JSON.stringify({ productId: product!._id }),
        })
        setInWishlist(true)
      }
    } catch {}
    finally { setWishlistLoading(false) }
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewOrderId) return
    setSubmitting(true); setReviewError('')
    try {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ orderId: reviewOrderId, productId: product!._id, rating: reviewRating, comment: reviewComment }),
      })
      const d = await res.json()
      if (d.success) {
        setReviewSuccess('Review submitted! It will appear after approval.')
        setShowForm(false); setReviewComment(''); setReviewRating(5)
      } else {
        setReviewError(d.error || 'Failed to submit review')
      }
    } catch { setReviewError('Failed to submit review') }
    finally { setSubmitting(false) }
  }

  /* ── loading / error guards ── */
  if (loading) return <div className="container mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>
  if (error && !product) return <div className="container mx-auto px-4 py-8 text-center text-red-500">{error}</div>
  if (!product) return <div className="container mx-auto px-4 py-8 text-center">Product not found</div>

  const variant        = product.variants.find(v => v.sku === selectedVariant)
  const price          = variant ? (variant.discountedPrice ?? variant.originalPrice) : 0
  const hasDiscount    = !!(variant?.discountedPrice && variant.discountedPrice < variant.originalPrice)
  const discountPct    = hasDiscount ? Math.round(((variant!.originalPrice - variant!.discountedPrice!) / variant!.originalPrice) * 100) : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/products" className="text-blue-600 hover:underline mb-4 inline-block text-sm">← Back to products</Link>

      {/* ── Product info ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">

        {/* Image */}
        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
          {product.images[0] ? (
            <img src={product.images[0].url} alt={product.images[0].alt || product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
          )}
          {hasDiscount && (
            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold">
              {discountPct}% OFF
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-gray-400 text-sm mb-1">{product.brand}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>

          {/* Rating */}
          {product.ratingCount > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Stars value={product.ratingAverage} />
              <span className="text-sm text-gray-500">{product.ratingAverage.toFixed(1)} ({product.ratingCount} review{product.ratingCount !== 1 ? 's' : ''})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl font-bold text-gray-900">${price.toFixed(2)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-gray-400 line-through">${variant!.originalPrice.toFixed(2)}</span>
                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-sm font-semibold">Save {discountPct}%</span>
              </>
            )}
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>

          {/* Variants */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Variant</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map(v => {
                const vHasDiscount = !!(v.discountedPrice && v.discountedPrice < v.originalPrice)
                const vPrice = v.discountedPrice ?? v.originalPrice
                const vPct   = vHasDiscount ? Math.round(((v.originalPrice - v.discountedPrice!) / v.originalPrice) * 100) : 0
                return (
                  <button
                    key={v.sku}
                    onClick={() => setSelectedVariant(v.sku)}
                    disabled={v.quantity === 0}
                    className={`px-4 py-2 border-2 rounded-xl text-left min-w-[110px] transition-all ${selectedVariant === v.sku ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'} ${v.quantity === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-sm">{v.label}</div>
                    <div className="text-xs mt-0.5">
                      {vHasDiscount ? (
                        <><span className="text-green-600 font-semibold">${vPrice.toFixed(2)}</span><span className="text-gray-400 line-through ml-1">${v.originalPrice.toFixed(2)}</span></>
                      ) : (
                        <span className="text-gray-700">${vPrice.toFixed(2)}</span>
                      )}
                    </div>
                    {vHasDiscount && <div className="text-xs text-red-600 font-semibold mt-0.5">{vPct}% OFF</div>}
                    {v.quantity === 0 && <div className="text-xs text-gray-400 mt-0.5">Out of stock</div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Qty */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-2">Quantity</p>
            <input
              type="number" min="1" max={variant?.quantity || 1}
              value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || !variant || variant.quantity === 0}
              className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {addingToCart ? 'Adding…' : variant?.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>

            {/* Wishlist toggle */}
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl transition-all ${inWishlist ? 'border-red-400 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400'}`}
            >
              {inWishlist ? '♥' : '♡'}
            </button>
          </div>

          {success && <p className="mt-3 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}
          {error   && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {/* Wishlist link */}
          {user && (
            <Link href="/wishlist" className="block mt-3 text-xs text-gray-400 hover:text-gray-600">
              View wishlist →
            </Link>
          )}
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className="border-t border-gray-100 pt-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
            {product.ratingCount > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Stars value={product.ratingAverage} size="lg" />
                <span className="text-gray-500 text-sm">{product.ratingAverage.toFixed(1)} out of 5 · {reviewTotal} review{reviewTotal !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Write a review CTA */}
          {user && eligibleOrders.length > 0 && !reviewSuccess && (
            <button
              onClick={() => setShowForm(f => !f)}
              className="px-4 py-2 border border-gray-900 text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-900 hover:text-white transition-colors"
            >
              {showForm ? 'Cancel' : 'Write a Review'}
            </button>
          )}
        </div>

        {reviewSuccess && (
          <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {reviewSuccess}
          </div>
        )}

        {/* Review form */}
        {showForm && (
          <form onSubmit={submitReview} className="mb-8 border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Your Review</h3>

            {eligibleOrders.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">For which order?</label>
                <select
                  value={reviewOrderId}
                  onChange={e => setReviewOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {eligibleOrders.map(o => (
                    <option key={o._id} value={o._id}>
                      Order #{o._id.slice(-8).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString()} · {o.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Rating</label>
              <StarPicker value={reviewRating} onChange={setReviewRating} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Comment <span className="text-red-400">*</span></label>
              <textarea
                required
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={4}
                minLength={10}
                maxLength={2000}
                placeholder="Share your experience with this product…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">{reviewComment.length}/2000 · minimum 10 characters</p>
            </div>

            {reviewError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{reviewError}</p>}

            <button
              type="submit"
              disabled={submitting || reviewComment.trim().length < 10}
              className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        )}

        {/* Not eligible message */}
        {user && eligibleOrders.length === 0 && (
          <p className="text-sm text-gray-400 mb-6">Purchase this product to leave a review.</p>
        )}
        {!user && (
          <p className="text-sm text-gray-400 mb-6">
            <Link href="/login" className="text-gray-700 underline hover:text-gray-900">Sign in</Link> to write a review.
          </p>
        )}

        {/* Review list */}
        {reviewsLoading ? (
          <div className="text-gray-400 text-sm py-4">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">⭐</p>
            <p className="text-sm">No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {reviews.map(r => (
              <div key={r._id} className="border border-gray-100 rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{r.user?.name || 'Customer'}</p>
                    <Stars value={r.rating} />
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mt-2">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
