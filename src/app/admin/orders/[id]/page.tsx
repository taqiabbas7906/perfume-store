'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface StatusEntry {
  status: string
  changedAt: string
  changedBy?: string
  note?: string
}

interface OrderDetail {
  _id: string
  status: string
  paymentStatus: string
  totalAmount: number
  subtotal: number
  discount: number
  shipping: number
  tax: number
  currency: string
  createdAt: string
  updatedAt: string
  paidAt?: string
  shippedAt?: string
  cancelledAt?: string
  cancelReason?: string
  trackingNumber?: string
  trackingCarrier?: string
  trackingUrl?: string
  guestEmail?: string
  user?: { _id: string; name: string; email: string; phone?: string }
  shippingAddress: { name: string; address: string; city: string; country: string; zip: string; phone: string }
  items: Array<{ name: string; variantLabel?: string; variantSku: string; price: number; quantity: number; subtotal: number; image?: string }>
  statusHistory: StatusEntry[]
}

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    paid:      'bg-green-100 text-green-800 border-green-200',
    shipped:   'bg-blue-100 text-blue-800 border-blue-200',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    failed:    'bg-red-100 text-red-800 border-red-200',
    refunded:  'bg-amber-100 text-amber-800 border-amber-200',
  }
  return map[s] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function AdminOrderDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { user } = useAuth()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [busy, setBusy] = useState(false)

  const loadOrder = useCallback(async () => {
    if (!params?.id) return
    setLoading(true)
    setError('')
    try {
      const res = await authFetch(`/api/admin/orders/${params.id}`)
      const data = await res.json()
      if (data.success) setOrder(data.order)
      else setError(data.error || 'Failed to load order')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [params?.id])

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return
      try {
        const res = await authFetch('/api/auth/me')
        const data = await res.json()
        if (data.user?.role === 'admin') {
          setIsAdmin(true)
          loadOrder()
        } else router.push('/')
      } catch {
        router.push('/')
      }
    }
    checkAdmin()
  }, [user, router, loadOrder])

  const changeStatus = async (next: string, note?: string) => {
    if (!order) return
    setBusy(true)
    try {
      const res = await authFetch(`/api/admin/orders/${order._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next, note }),
      })
      const data = await res.json()
      if (data.success) {
        await loadOrder()
      } else {
        setError(data.error || 'Failed to update status')
      }
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  if (!isAdmin) return null
  if (loading) return <div className="container mx-auto px-4 py-8 text-gray-400">Loading order…</div>
  if (error)   return <div className="container mx-auto px-4 py-8 text-red-600">{error}</div>
  if (!order)  return <div className="container mx-auto px-4 py-8 text-gray-400">Order not found</div>

  const canMarkDelivered = order.status === 'shipped'
  const canMarkPaid      = order.status === 'pending'

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">← Back to orders</Link>
          <h1 className="text-3xl font-bold mt-1">Order #{order._id.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-gray-500 mt-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full border text-sm ${statusColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <section className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer</h2>
            <div className="text-sm">
              <div className="font-medium">{order.user?.name ?? order.shippingAddress.name}</div>
              <div className="text-gray-600">{order.user?.email ?? order.guestEmail ?? '—'}</div>
              <div className="text-gray-600">{order.shippingAddress.phone}</div>
            </div>
          </section>

          {/* Shipping address */}
          <section className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Shipping Address</h2>
            <p className="text-sm leading-relaxed">
              {order.shippingAddress.name}<br />
              {order.shippingAddress.address}<br />
              {order.shippingAddress.city}, {order.shippingAddress.zip}<br />
              {order.shippingAddress.country}<br />
              {order.shippingAddress.phone}
            </p>
          </section>

          {/* Items */}
          <section className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</h2>
            <ul className="divide-y divide-gray-100">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-gray-500">{it.variantLabel ?? it.variantSku} · ×{it.quantity}</div>
                  </div>
                  <div className="font-medium">${it.subtotal.toFixed(2)}</div>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-${order.discount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span>${order.shipping.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>${order.tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold pt-1 border-t border-gray-100"><span>Total</span><span>${order.totalAmount.toFixed(2)}</span></div>
            </div>
          </section>

          {/* Tracking */}
          {order.trackingNumber && (
            <section className="border border-blue-200 bg-blue-50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-3">Tracking</h2>
              <div className="text-sm">
                <div><span className="text-blue-700">Carrier:</span> <strong>{order.trackingCarrier}</strong></div>
                <div className="font-mono mt-1">{order.trackingNumber}</div>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline mt-2 inline-block">
                    Open carrier page →
                  </a>
                )}
                {order.shippedAt && (
                  <p className="text-xs text-blue-700 mt-2">Shipped {new Date(order.shippedAt).toLocaleString()}</p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Action buttons */}
          <section className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h2>
            <div className="space-y-2 text-sm">
              <button
                disabled={!canMarkPaid || busy}
                onClick={() => changeStatus('paid', 'Marked paid manually')}
                className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-40"
              >
                Mark as paid
              </button>
              <button
                disabled={!canMarkDelivered || busy}
                onClick={() => changeStatus('delivered', 'Confirmed delivery')}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-40"
              >
                Mark as delivered
              </button>
              <Link
                href="/admin/orders"
                className="w-full block text-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Manage on list view
              </Link>
            </div>
          </section>

          {/* Timeline */}
          <section className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h2>
            <ol className="relative border-l border-gray-200 ml-2">
              {order.statusHistory.slice().reverse().map((entry, i) => (
                <li key={i} className="ml-4 pb-4 last:pb-0">
                  <span className={`absolute -left-2 w-3 h-3 rounded-full border-2 border-white ${statusColor(entry.status).split(' ')[0]}`} />
                  <div className="text-sm font-medium capitalize">{entry.status}</div>
                  <div className="text-xs text-gray-500">{new Date(entry.changedAt).toLocaleString()}</div>
                  <div className="text-xs text-gray-400 capitalize">by {entry.changedBy ?? 'system'}</div>
                  {entry.note && <p className="text-xs text-gray-600 mt-1">{entry.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          {order.cancelReason && (
            <section className="border border-red-200 bg-red-50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2">Cancellation</h2>
              <p className="text-sm text-red-700">{order.cancelReason}</p>
              {order.cancelledAt && (
                <p className="text-xs text-red-600 mt-1">{new Date(order.cancelledAt).toLocaleString()}</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
