'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { OrderDetailSkeleton } from '@/components/ui/Skeleton'

interface StatusEntry {
  status: string
  changedAt: string
  changedBy?: string
  note?: string
}

interface OrderItem {
  productId: string
  variantSku: string
  name: string
  variantLabel?: string
  price: number
  quantity: number
  subtotal: number
  image?: string
  slug?: string | null
}

interface CustomerOrderDetail {
  _id: string
  status: string
  totalAmount: number
  subtotal: number
  discount: number
  shipping: number
  tax: number
  currency: string
  createdAt: string
  paidAt?: string
  shippedAt?: string
  trackingNumber?: string
  trackingCarrier?: string
  trackingUrl?: string
  shippingAddress: {
    name: string
    address: string
    city: string
    state?: string
    country: string
    zip: string
    phone: string
  }
  items: OrderItem[]
  statusHistory: StatusEntry[]
  review: {
    productId: string
    rating: number
    comment: string
    approved: boolean
    createdAt: string
  } | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-emerald-100 text-emerald-800',
  shipped: 'bg-sky-100 text-sky-800',
  in_transit: 'bg-sky-100 text-sky-800',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-amber-100 text-amber-800',
  processing: 'bg-sky-100 text-sky-800',
}

function statusClasses(s: string) {
  return STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'
}

function fmtMoney(n: number) {
  return `$${(Number(n) || 0).toFixed(2)}`
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrder = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await authFetch(`/api/orders/${params?.id}`, { signal })
        const data = await res.json()
        if (signal?.aborted) return
        if (data.success) {
          setOrder(data.order)
          setError('')
        } else {
          setError(data.error || 'Order not found')
        }
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return
        setError('Network error')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [params?.id],
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    const ac = new AbortController()
    loadOrder(ac.signal)
    return () => ac.abort()
  }, [user, authLoading, router, loadOrder])

  if (authLoading || loading) return <OrderDetailSkeleton />
  if (error) {
    return (
      <main className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 text-sm tracking-wide">
          {error}
        </div>
        <Link
          href="/account?tab=orders"
          className="inline-flex items-center gap-1.5 mt-6 text-[10px] tracking-[0.3em] uppercase text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors"
        >
          <i className="ri-arrow-left-line text-sm" />
          Back to orders
        </Link>
      </main>
    )
  }
  if (!order) return null

  const isDelivered = order.status === 'delivered'
  const reviewedProductId = order.review?.productId ?? null
  const orderShortId = `INS-${order._id.slice(-8).toUpperCase()}`

  return (
    <main className="pt-28 pb-20 bg-[var(--color-cream-600)] min-h-screen">
      <div className="max-w-5xl mx-auto px-6">
        <Link
          href="/account?tab=orders"
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gray-400 hover:text-[var(--color-gold)] transition-colors mb-6"
        >
          <i className="ri-arrow-left-line text-sm" />
          Back to orders
        </Link>

        {/* Header */}
        <div className="bg-white p-6 lg:p-8 border-b border-[var(--color-border-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
                <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
                  Order Detail
                </span>
              </div>
              <h1 className=" text-3xl md:text-4xl font-light text-[var(--color-ink)]">
                Order <span className="font-bold">#{orderShortId}</span>
              </h1>
              <p className="text-xs text-gray-400 tracking-wide mt-2">
                Placed {fmtDate(order.createdAt)}
              </p>
            </div>
            <span
              className={`text-[10px] font-semibold px-3 py-1.5 tracking-widest uppercase rounded-sm capitalize ${statusClasses(
                order.status,
              )}`}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Tracking strip */}
        {order.trackingNumber && (
          <div className="bg-[var(--color-cream-200)] border-b border-[var(--color-border-soft)] px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <i className="ri-truck-line text-[var(--color-gold)]" />
              <span className="text-xs text-[var(--color-ink-soft)] tracking-wide">
                <strong className="text-[var(--color-ink)]">
                  {order.trackingCarrier ?? 'Carrier'}
                </strong>{' '}
                · <span className="font-mono">{order.trackingNumber}</span>
              </span>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-[10px] tracking-[0.25em] uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors flex items-center gap-1.5"
                >
                  Track shipment
                  <i className="ri-external-link-line text-sm" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[var(--color-border-soft)]">
          {/* Items */}
          <section className="lg:col-span-2 bg-white p-6 lg:p-8">
            <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-[var(--color-ink)] mb-5">
              Items
            </h2>
            <ul className="divide-y divide-[var(--color-border-soft)]">
              {order.items.map((it) => (
                <OrderItemRow
                  key={`${it.variantSku}-${it.productId}`}
                  item={it}
                  isDelivered={isDelivered}
                  orderId={order._id}
                  alreadyReviewedProductId={reviewedProductId}
                  reviewBlocked={Boolean(order.review)}
                  onReviewed={() => loadOrder()}
                />
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-[var(--color-border-soft)] space-y-2 text-sm">
              <Row label="Subtotal" value={fmtMoney(order.subtotal)} />
              {order.discount > 0 && (
                <Row
                  label="Discount"
                  value={`−${fmtMoney(order.discount)}`}
                  emphasis="emerald"
                />
              )}
              <Row label="Shipping" value={fmtMoney(order.shipping)} />
              <Row label="Tax" value={fmtMoney(order.tax)} />
              <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-[var(--color-border-soft)]">
                <span className="text-xs tracking-[0.3em] uppercase font-bold text-[var(--color-ink)]">
                  Order Total
                </span>
                <span className="text-2xl font-light text-[var(--color-ink)]">
                  {fmtMoney(order.totalAmount)}
                </span>
              </div>
            </div>
          </section>

          {/* Aside */}
          <aside className="bg-white p-6 lg:p-8 space-y-8">
            <div>
              <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-[var(--color-ink)] mb-4">
                Shipping To
              </h2>
              <address className="not-italic text-sm text-[var(--color-ink-soft)] leading-relaxed">
                <p className="font-semibold text-[var(--color-ink)]">
                  {order.shippingAddress.name}
                </p>
                <p>{order.shippingAddress.address}</p>
                <p>
                  {order.shippingAddress.city}
                  {order.shippingAddress.state
                    ? `, ${order.shippingAddress.state}`
                    : ''}{' '}
                  {order.shippingAddress.zip}
                </p>
                <p>{order.shippingAddress.country}</p>
                <p className="text-gray-400 mt-1">
                  {order.shippingAddress.phone}
                </p>
              </address>
            </div>

            <div>
              <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-[var(--color-ink)] mb-4">
                Timeline
              </h2>
              <ol className="relative border-l border-[var(--color-border-soft)] ml-1 space-y-4">
                {[...order.statusHistory].reverse().map((entry, i) => (
                  <li
                    key={`${entry.status}-${entry.changedAt}-${i}`}
                    className="ml-4 relative"
                  >
                    <span
                      className={`absolute -left-[21px] mt-1 w-2.5 h-2.5 rounded-full border border-white ${
                        statusClasses(entry.status).split(' ')[0]
                      }`}
                    />
                    <div className="text-xs font-semibold text-[var(--color-ink)] capitalize">
                      {entry.status.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {fmtDate(entry.changedAt)}
                    </div>
                    {entry.note && (
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        {entry.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>

        <p className="text-[10px] text-gray-400 tracking-wide text-center mt-8">
          Questions? Email{' '}
          <a
            href="mailto:support@Minzoshop.com"
            className="text-[var(--color-gold)] hover:underline"
          >
            support@Minzoshop.com
          </a>
        </p>
      </div>
    </main>
  )
}

/* ─── Subcomponents ─── */

function Row({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: 'emerald'
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className={`text-xs tracking-wide ${
          emphasis === 'emerald' ? 'text-emerald-600' : 'text-gray-500'
        }`}
      >
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          emphasis === 'emerald' ? 'text-emerald-600' : 'text-[var(--color-ink)]'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function OrderItemRow({
  item,
  isDelivered,
  orderId,
  alreadyReviewedProductId,
  reviewBlocked,
  onReviewed,
}: {
  item: OrderItem
  isDelivered: boolean
  orderId: string
  alreadyReviewedProductId: string | null
  reviewBlocked: boolean
  onReviewed: () => void
}) {
  const [open, setOpen] = useState(false)
  const isReviewedItem = alreadyReviewedProductId === item.productId
  const canReviewNow = isDelivered && !reviewBlocked && !isReviewedItem

  return (
    <li className="py-5 flex flex-col sm:flex-row gap-4">
      <div className="flex gap-4 flex-1 min-w-0">
        <div className="relative w-20 h-24 bg-[var(--color-cream-500)] overflow-hidden flex-shrink-0">
          {item.image && (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="80px"
              className="object-cover object-top"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {item.slug ? (
            <Link
              href={`/product/${item.slug}`}
              className="text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors leading-snug line-clamp-2"
            >
              {item.name}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-[var(--color-ink)] leading-snug line-clamp-2">
              {item.name}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-0.5">
            {item.variantLabel ?? item.variantSku} · Qty {item.quantity}
          </p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <p className="text-sm font-bold text-[var(--color-ink)]">
              {fmtMoney(item.subtotal)}
            </p>
            {isReviewedItem && (
              <span className="text-[10px] tracking-widest uppercase font-semibold text-emerald-600 flex items-center gap-1.5">
                <i className="ri-checkbox-circle-line" />
                Review submitted
              </span>
            )}
          </div>

          {canReviewNow && !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-4 inline-flex items-center gap-2 border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-white text-[10px] tracking-[0.25em] uppercase font-bold px-5 py-2.5 transition-all duration-300"
            >
              <i className="ri-star-line text-sm" />
              Write a Review
            </button>
          )}

          {open && canReviewNow && (
            <ReviewForm
              productId={item.productId}
              productName={item.name}
              orderId={orderId}
              onCancel={() => setOpen(false)}
              onSubmitted={() => {
                setOpen(false)
                onReviewed()
              }}
            />
          )}

          {isDelivered && reviewBlocked && !isReviewedItem && (
            <p className="mt-3 text-[10px] text-gray-400 tracking-wide">
              One review per order — you already reviewed another item from this
              purchase.
            </p>
          )}

          {!isDelivered && item.slug && (
            <Link
              href={`/product/${item.slug}`}
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase font-semibold text-gray-400 hover:text-[var(--color-gold)] transition-colors"
            >
              View product
              <i className="ri-arrow-right-line text-sm" />
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

function ReviewForm({
  productId,
  productName,
  orderId,
  onCancel,
  onSubmitted,
}: {
  productId: string
  productName: string
  orderId: string
  onCancel: () => void
  onSubmitted: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
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
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ orderId, productId, rating, comment: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        setError(data?.error ?? 'Could not submit review. Please try again.')
        return
      }
      onSubmitted()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 bg-[var(--color-cream-100)] border border-[var(--color-border-soft)] p-5 space-y-4 animate-fadeIn"
    >
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2">
          Your rating for{' '}
          <span className="text-[var(--color-gold)]">{productName}</span>
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
          htmlFor="review-comment"
          className="block text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2"
        >
          Your review
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          minLength={10}
          maxLength={500}
          placeholder="Share what you loved about this product (at least 10 characters)"
          className="w-full border border-[var(--color-border)] bg-white text-sm text-[var(--color-ink)] placeholder-gray-300 px-3 py-2.5 outline-none focus:border-[var(--color-gold)] transition-colors resize-y"
          required
        />
        <p className="text-[10px] text-gray-400 mt-1">
          {trimmed.length}/500 — reviews are public after moderation.
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
          {submitting ? 'Submitting…' : 'Submit Review'}
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
