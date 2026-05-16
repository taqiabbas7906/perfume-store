'use client'

import { useEffect, useState } from 'react'
import { smartFetch } from '@/lib/api'
import { formatPrice } from '@/lib/utils/format'

interface RecentOrder {
  _id: string
  status: string
  total: number
  items?: Array<{ name: string }>
  createdAt: string
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

export default function AccountOverview({
  loading: parentLoading,
  onNavigate,
}: {
  loading?: boolean
  onNavigate: (tab: string) => void
}) {
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [wishlistCount, setWishlistCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      smartFetch('/api/orders?limit=5')
        .then((r) => r.json())
        .catch(() => null),
      smartFetch('/api/wishlist')
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([ordersData, wishlistData]) => {
        if (cancelled) return
        if (ordersData?.success) setOrders(ordersData.orders ?? [])
        if (wishlistData?.success) {
          setWishlistCount(
            wishlistData.count ?? wishlistData.items?.length ?? 0,
          )
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const stats = [
    {
      icon: 'ri-shopping-bag-3-line',
      label: 'Total Orders',
      value: orders.length.toString(),
    },
    {
      icon: 'ri-heart-line',
      label: 'Wishlist Items',
      value: wishlistCount.toString(),
    },
    { icon: 'ri-star-line', label: 'Reviews Given', value: '—' },
    { icon: 'ri-coupon-3-line', label: 'Active Coupons', value: '—' },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-6 flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center border border-[var(--color-border)] flex-shrink-0">
              <i className={`${s.icon} text-[var(--color-gold)] text-lg`} />
            </div>
            <div>
              <div className="font-serif text-2xl font-light text-[var(--color-ink)]">
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
          {loading || parentLoading ? (
            <div className="py-8 px-6 text-center text-gray-400 text-xs tracking-wide">
              Loading…
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 px-6 text-center text-gray-400 text-sm tracking-wide">
              You haven&apos;t placed any orders yet.
            </div>
          ) : (
            orders.slice(0, 3).map((o) => (
              <div
                key={o._id}
                className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-cream-50)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      #{o._id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">
                      {o.items?.map((i) => i.name).join(', ') || '—'}
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
                      {formatPrice(o.total)}
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
    </div>
  )
}
