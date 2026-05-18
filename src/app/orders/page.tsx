'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { OrderListSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton'

interface CustomerOrder {
  _id: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  trackingNumber?: string
  trackingCarrier?: string
  items: Array<{ name: string; quantity: number; subtotal: number; image?: string }>
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

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/orders')
        const data = await res.json()
        if (cancelled) return
        if (data.success) setOrders(data.orders)
        else setError(data.error || 'Failed to load orders')
      } catch {
        if (!cancelled) setError('Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <PageHeaderSkeleton />
        <OrderListSkeleton />
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {error && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-50 border border-gray-200 rounded-xl">
          You haven&apos;t placed any orders yet.
          <div className="mt-3">
            <Link href="/products" className="text-blue-600 hover:underline">Browse products →</Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map(o => (
            <li key={o._id}>
              <Link
                href={`/orders/${o._id}`}
                className="block border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-mono text-xs text-gray-500">#{o._id.slice(-8).toUpperCase()}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-700 mt-1">
                      {o.items.length} item{o.items.length === 1 ? '' : 's'} · ${o.totalAmount.toFixed(2)}
                    </div>
                    {o.trackingNumber && (
                      <div className="text-xs text-blue-600 mt-1">Tracking: {o.trackingCarrier} {o.trackingNumber}</div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${statusBadge(o.status)}`}>{o.status}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
