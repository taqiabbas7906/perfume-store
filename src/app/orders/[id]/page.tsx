'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  shippingAddress: { name: string; address: string; city: string; country: string; zip: string; phone: string }
  items: Array<{ name: string; variantLabel?: string; variantSku: string; price: number; quantity: number; subtotal: number; image?: string }>
  statusHistory: StatusEntry[]
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-800',
    paid:      'bg-green-100 text-green-800',
    shipped:   'bg-blue-100 text-blue-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    failed:    'bg-red-100 text-red-800',
    refunded:  'bg-amber-100 text-amber-800',
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch(`/api/orders/${params?.id}`)
        const data = await res.json()
        if (cancelled) return
        if (data.success) setOrder(data.order)
        else setError(data.error || 'Order not found')
      } catch {
        if (!cancelled) setError('Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [params?.id, user, authLoading, router])

  if (authLoading || loading) return <OrderDetailSkeleton />
  if (error) return <main className="max-w-3xl mx-auto px-4 py-10 text-red-600">{error}</main>
  if (!order) return null

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/orders" className="text-sm text-blue-600 hover:underline">← All orders</Link>
      <div className="flex justify-between items-start mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order #{order._id.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-gray-500 mt-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${statusBadge(order.status)}`}>{order.status}</span>
      </div>

      {order.trackingNumber && (
        <section className="border border-blue-200 bg-blue-50 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-2">Your shipment</h2>
          <p className="text-sm">
            <strong>{order.trackingCarrier}</strong> · <span className="font-mono">{order.trackingNumber}</span>
          </p>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline mt-2 inline-block text-sm">
              Track shipment →
            </a>
          )}
        </section>
      )}

      <section className="border border-gray-200 rounded-xl p-5 mb-6 bg-white">
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

      <section className="border border-gray-200 rounded-xl p-5 mb-6 bg-white">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Shipping to</h2>
        <p className="text-sm leading-relaxed">
          {order.shippingAddress.name}<br />
          {order.shippingAddress.address}<br />
          {order.shippingAddress.city}, {order.shippingAddress.zip}<br />
          {order.shippingAddress.country}<br />
          {order.shippingAddress.phone}
        </p>
      </section>

      <section className="border border-gray-200 rounded-xl p-5 bg-white">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h2>
        <ol className="relative border-l border-gray-200 ml-2">
          {order.statusHistory.slice().reverse().map((entry, i) => (
            <li key={i} className="ml-4 pb-4 last:pb-0">
              <span className={`absolute -left-2 w-3 h-3 rounded-full border-2 border-white ${statusBadge(entry.status).split(' ')[0]}`} />
              <div className="text-sm font-medium capitalize">{entry.status}</div>
              <div className="text-xs text-gray-500">{new Date(entry.changedAt).toLocaleString()}</div>
              {entry.note && <p className="text-xs text-gray-600 mt-1">{entry.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
