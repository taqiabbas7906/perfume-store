'use client'

import { useEffect, useState } from 'react'
import { smartFetch } from '@/lib/api'
import { formatPrice } from '@/lib/utils/format'

interface OrderItem {
  productId: string
  variantSku: string
  quantity: number
  price: number
  name: string
  variantLabel?: string
}

interface Order {
  _id: string
  status: string
  total: number
  subtotal?: number
  items: OrderItem[]
  createdAt: string
  tracking?: { carrier?: string; number?: string }
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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function AccountOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    smartFetch('/api/orders?limit=50')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success) setOrders(data.orders ?? [])
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="bg-white">
      <div className="px-6 py-4 border-b border-[var(--color-border-soft)]">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] tracking-wide">
          Order History
        </h2>
        <p className="text-[10px] text-gray-400 mt-0.5 tracking-wide">
          {orders.length} order{orders.length === 1 ? '' : 's'} placed
        </p>
      </div>

      <div className="divide-y divide-[var(--color-cream-400)]">
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-xs tracking-widest uppercase">
            Loading…
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm text-gray-400">No orders yet.</p>
          </div>
        ) : (
          orders.map((o) => {
            const isOpen = expanded === o._id
            const shortId = `INS-${o._id.slice(-8).toUpperCase()}`
            return (
              <div key={o._id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : o._id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--color-cream-50)] transition-colors text-left"
                >
                  <div className="flex items-center gap-5">
                    <div>
                      <p className="text-xs font-bold text-[var(--color-ink)]">
                        #{shortId}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatDate(o.createdAt)} · {o.items.length} item
                        {o.items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-sm font-bold text-[var(--color-ink)] hidden sm:block">
                      {formatPrice(o.total)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 tracking-wide rounded-sm capitalize ${
                        STATUS_COLORS[o.status] ?? 'text-gray-500 bg-gray-50'
                      }`}
                    >
                      {o.status.replace(/_/g, ' ')}
                    </span>
                    <i
                      className={`ri-arrow-down-s-line text-gray-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 bg-[var(--color-cream-50)] border-t border-[var(--color-cream-400)]">
                    <div className="pt-4 space-y-3">
                      {o.items.map((item) => (
                        <div
                          key={item.variantSku}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[var(--color-ink)]">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {item.variantLabel
                                ? `${item.variantLabel} · `
                                : ''}
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-xs font-bold text-[var(--color-ink)]">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-[var(--color-border-soft)] flex flex-wrap items-center justify-between gap-3">
                        {o.tracking?.number && (
                          <p className="text-[10px] text-gray-400 tracking-wide">
                            Tracking:{' '}
                            <span className="font-semibold text-[var(--color-ink)]">
                              {o.tracking.number}
                            </span>
                          </p>
                        )}
                        <div className="flex gap-3 ml-auto">
                          <a
                            href={`/orders/${o._id}`}
                            className="text-[10px] tracking-widest uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors"
                          >
                            View Details
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
