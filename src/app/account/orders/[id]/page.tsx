'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { OrderDetailSkeleton } from '@/components/ui/Skeleton'

interface OrderItem {
  name: string
  variantLabel: string
  quantity: number
  price: number
  subtotal: number
  image?: string
}

interface StatusEntry {
  status: string
  changedAt: string
  changedBy: string
  note?: string
}

interface ShippingAddress {
  name: string
  address: string
  city: string
  country: string
  zip: string
  phone: string
}

interface Order {
  _id: string
  status: string
  paymentStatus: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  subtotal: number
  discount: number
  shipping: number
  tax: number
  totalAmount: number
  currency: string
  createdAt: string
  paidAt?: string
  shippedAt?: string
  trackingNumber?: string
  trackingCarrier?: string
  trackingUrl?: string
  cancelReason?: string
  statusHistory: StatusEntry[]
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  paid:      'bg-blue-100 text-blue-700',
  shipped:   'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded:  'bg-gray-100 text-gray-600',
  failed:    'bg-red-100 text-red-700',
}

const TIMELINE_STEPS = ['pending', 'paid', 'shipped', 'delivered']

export default function OrderDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    authFetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setOrder(data.order)
        else setError(data.error ?? 'Order not found')
      })
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false))
  }, [id, user, authLoading, router])

  if (authLoading || loading) {
    return <OrderDetailSkeleton />
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
        <Link href="/account/orders" className="text-sm underline">← Back to orders</Link>
      </div>
    )
  }

  const isCancelled = order.status === 'cancelled' || order.status === 'failed' || order.status === 'refunded'
  const activeStep  = TIMELINE_STEPS.indexOf(order.status)

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account/orders" className="text-sm text-gray-500 hover:text-gray-700">← Orders</Link>
        <h1 className="text-2xl font-bold">Order Detail</h1>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-sm text-gray-400">#{String(order._id).slice(-8).toUpperCase()}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Placed {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {order.status}
        </span>
      </div>

      {/* Progress timeline (only for normal flow) */}
      {!isCancelled && (
        <div className="mb-8 px-2">
          <div className="flex items-center">
            {TIMELINE_STEPS.map((step, i) => {
              const done    = activeStep >= i
              const current = activeStep === i
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      done ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
                    } ${current ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <p className={`text-xs mt-1 capitalize whitespace-nowrap ${done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {step}
                    </p>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 ${activeStep > i ? 'bg-gray-900' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tracking info */}
      {order.trackingNumber && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-purple-900 mb-1">Tracking Information</p>
          <p className="text-sm text-purple-800">
            {order.trackingCarrier} — {order.trackingNumber}
          </p>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-700 underline mt-1 inline-block"
            >
              Track your package →
            </a>
          )}
        </div>
      )}

      {/* Cancel reason */}
      {order.cancelReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-red-800 mb-1">Cancellation Reason</p>
          <p className="text-sm text-red-700">{order.cancelReason}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Items */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-500">Items</h2>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.variantLabel}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                </div>
                <p className="text-sm font-medium shrink-0">${item.subtotal.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary + address */}
        <div className="space-y-4">
          {/* Price breakdown */}
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-500">Summary</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-700"><span>Discount</span><span>−${order.discount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{order.shipping === 0 ? 'Free' : '$' + order.shipping.toFixed(2)}</span></div>
              {order.tax > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>${order.tax.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                <span>Total</span><span>${order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-500">Ship To</h2>
            <div className="text-sm text-gray-700 space-y-0.5">
              <p className="font-medium">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.country} {order.shippingAddress.zip}</p>
              <p className="text-gray-500">{order.shippingAddress.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status history */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-500">Timeline</h2>
          <div className="space-y-3">
            {[...order.statusHistory].reverse().map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_COLORS[entry.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {entry.status}
                  </span>
                  {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(entry.changedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
