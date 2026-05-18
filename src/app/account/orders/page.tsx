'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { OrderListSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton'

interface OrderItem {
  name: string
  variantLabel: string
  quantity: number
  price: number
  subtotal: number
  image?: string
}

interface Order {
  _id: string
  status: string
  paymentStatus: string
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  totalAmount: number
  currency: string
  createdAt: string
  trackingNumber?: string
  trackingCarrier?: string
  trackingUrl?: string
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

export default function OrderHistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    authFetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        if (data.success) setOrders(data.orders)
        else setError('Failed to load orders')
      })
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <PageHeaderSkeleton />
        <OrderListSkeleton count={5} />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">← Account</Link>
        <h1 className="text-2xl font-bold">Order History</h1>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {orders.length === 0 && !error ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
          <Link href="/products" className="text-sm underline text-gray-700 hover:text-black">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link
              key={order._id}
              href={`/account/orders/${order._id}`}
              className="block border rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">#{String(order._id).slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-semibold">${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Item thumbnails */}
              <div className="flex gap-2 flex-wrap">
                {order.items.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-6 h-6 object-cover rounded" />
                    )}
                    <span>{item.name}</span>
                    <span className="text-gray-400">×{item.quantity}</span>
                  </div>
                ))}
                {order.items.length > 4 && (
                  <span className="text-xs text-gray-400 px-2 py-1">+{order.items.length - 4} more</span>
                )}
              </div>

              {order.trackingNumber && (
                <p className="mt-2 text-xs text-purple-600">
                  Tracking: {order.trackingCarrier} {order.trackingNumber}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
