'use client'

import { useEffect, useRef, useState } from 'react'
import { smartFetch } from '@/lib/api'
import { formatPrice } from '@/lib/utils/format'
import { useWishlist } from '@/context/WishlistContext'
import { AccountOverviewSkeleton } from '@/components/ui/Skeleton'
import type { VoucherType } from '@/types'

interface RecentOrder {
  _id: string
  status: string
  totalAmount: number
  items?: Array<{ name: string }>
  createdAt: string
}

interface FeaturedVoucher {
  _id: string
  code: string
  type: VoucherType
  value: number
  minOrderAmount: number
  maxDiscountAmount?: number
  expiresAt?: string
}

interface AccountOverviewData {
  totals: {
    orderCount: number
    orderTotal: number
    reviewCount: number
    voucherCount: number
  }
  recentOrders: RecentOrder[]
  featuredVouchers: FeaturedVoucher[]
}

const emptyOverview: AccountOverviewData = {
  totals: {
    orderCount: 0,
    orderTotal: 0,
    reviewCount: 0,
    voucherCount: 0,
  },
  recentOrders: [],
  featuredVouchers: [],
}

const STATUS_COLORS: Record<string, string> = {
  delivered: 'text-emerald-600 bg-emerald-50',
  shipped: 'text-amber-600 bg-amber-50',
  in_transit: 'text-amber-600 bg-amber-50',
  pending: 'text-gray-500 bg-gray-50',
  processing: 'text-sky-600 bg-sky-50',
  paid: 'text-emerald-600 bg-emerald-50',
  cancelled: 'text-red-500 bg-red-50',
  refunded: 'text-red-500 bg-red-50',
}

function formatVoucherValue(voucher: FeaturedVoucher) {
  if (voucher.type === 'free_shipping') return 'Free Shipping'
  if (voucher.type === 'percentage') {
    return voucher.maxDiscountAmount
      ? `${voucher.value}% OFF up to ${formatPrice(voucher.maxDiscountAmount)}`
      : `${voucher.value}% OFF`
  }
  return `${formatPrice(voucher.value)} OFF`
}

function formatVoucherMeta(voucher: FeaturedVoucher) {
  const parts: string[] = []
  if (voucher.minOrderAmount > 0) {
    parts.push(`${formatPrice(voucher.minOrderAmount)} minimum`)
  }
  if (voucher.expiresAt) {
    parts.push(
      `Ends ${new Date(voucher.expiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`,
    )
  }
  return parts.join(' | ')
}

function fallbackCopyToClipboard(text: string) {
  if (typeof document === 'undefined') return false

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

export default function AccountOverview({
  loading: parentLoading,
  onNavigate,
}: {
  loading?: boolean
  onNavigate: (tab: string) => void
}) {
  const [overview, setOverview] = useState<AccountOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState('')
  const copiedTimerRef = useRef<number | null>(null)
  const { count: wishlistCount } = useWishlist()

  useEffect(() => {
    let cancelled = false
    smartFetch('/api/account/overview')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setOverview(data?.success ? data : emptyOverview)
      })
      .catch(() => {
        if (!cancelled) setOverview(emptyOverview)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current)
    }
  }, [])

  function markVoucherCopied(code: string) {
    setCopiedCode(code)
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = window.setTimeout(() => {
      setCopiedCode('')
      copiedTimerRef.current = null
    }, 1800)
  }

  async function copyVoucherCode(code: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
        markVoucherCopied(code)
        return
      }

      if (fallbackCopyToClipboard(code)) markVoucherCopied(code)
    } catch {
      if (fallbackCopyToClipboard(code)) markVoucherCopied(code)
    }
  }

  if (loading || parentLoading) return <AccountOverviewSkeleton />

  const data = overview ?? emptyOverview
  const orders = data.recentOrders
  const stats = [
    {
      icon: 'ri-shopping-bag-3-line',
      label: 'Total Orders',
      value: data.totals.orderCount.toString(),
    },
    {
      icon: 'ri-money-dollar-circle-line',
      label: 'Order Total',
      value: formatPrice(data.totals.orderTotal),
    },
    {
      icon: 'ri-heart-line',
      label: 'Wishlist Items',
      value: wishlistCount.toString(),
    },
    {
      icon: 'ri-star-line',
      label: 'Reviews Given',
      value: data.totals.reviewCount.toString(),
    },
    {
      icon: 'ri-coupon-3-line',
      label: 'Available Vouchers',
      value: data.totals.voucherCount.toString(),
    },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-6 flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center border border-[var(--color-border)] flex-shrink-0">
              <i className={`${s.icon} text-[var(--color-gold)] text-lg`} />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-2xl font-light text-[var(--color-ink)] truncate">
                {s.value}
              </div>
              <div className="text-[10px] text-gray-400 tracking-widest uppercase">
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-soft)]">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] tracking-wide">
            Recent Orders
          </h2>
          <button
            onClick={() => onNavigate('orders')}
            className="text-[10px] tracking-widest uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors"
          >
            View All
          </button>
        </div>
        <div className="divide-y divide-[var(--color-cream-400)]">
          {orders.length === 0 ? (
            <div className="py-12 px-6 text-center text-gray-400 text-sm tracking-wide">
              You haven&apos;t placed any orders yet.
            </div>
          ) : (
            orders.slice(0, 3).map((o) => (
              <div
                key={o._id}
                className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-cream-50)] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      #{o._id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">
                      {o.items?.map((i) => i.name).join(', ') || '-'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-5">
                  <div className="hidden sm:block">
                    <p className="text-[10px] text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs font-bold text-[var(--color-ink)] mt-0.5">
                      {formatPrice(o.totalAmount)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 tracking-wide rounded-sm capitalize ${
                      STATUS_COLORS[o.status] ?? 'text-gray-500 bg-gray-50'
                    }`}
                  >
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white p-6">
        <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-4 tracking-wide">
          Promo Codes
        </h3>
        {data.featuredVouchers.length === 0 ? (
          <p className="text-[10px] text-gray-400 leading-relaxed">
            No promo codes are available right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.featuredVouchers.map((voucher) => {
              const copied = copiedCode === voucher.code
              return (
                <button
                  type="button"
                  key={voucher._id}
                  onClick={() => void copyVoucherCode(voucher.code)}
                  className="flex w-full items-center justify-between gap-4 border border-dashed border-[var(--color-gold-soft)] px-3 py-2.5 bg-[var(--color-cream-300)] text-left cursor-pointer transition-colors hover:border-[var(--color-gold)] hover:bg-[var(--color-cream-400)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                  aria-label={`Copy voucher code ${voucher.code}`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--color-gold)] truncate">
                      {voucher.code}
                    </p>
                    {formatVoucherMeta(voucher) && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatVoucherMeta(voucher)}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-ink)] bg-white px-2 py-1 border border-[var(--color-border)] whitespace-nowrap">
                    {copied ? (
                      <>
                        <i
                          className="ri-check-line text-emerald-600"
                          aria-hidden="true"
                        />
                        Copied
                      </>
                    ) : (
                      <>
                        {formatVoucherValue(voucher)}
                        <i
                          className="ri-file-copy-line text-[var(--color-gold)]"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
