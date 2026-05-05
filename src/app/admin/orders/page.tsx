'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface OrderItem {
  productId: string
  variantSku: string
  name: string
  variantLabel: string
  price: number
  quantity: number
  subtotal: number
  image: string
}

interface Order {
  _id: string
  status: string
  paymentStatus: string
  totalAmount: number
  createdAt: string
  items: OrderItem[]
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchOrders = async () => {
    try {
      const res = await authFetch('/api/orders')
      const data = await res.json()
      if (data.success) {
        setOrders(data.orders)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdating(orderId)
    try {
      const res = await authFetch('/api/orders', {
        method: 'PATCH',
        body: JSON.stringify({ orderId, status }),
      })
      const data = await res.json()
      if (data.success) {
        fetchOrders()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return
      try {
        const res = await authFetch('/api/auth/me')
        const data = await res.json()
        if (data.user?.role === 'admin') {
          setIsAdmin(true)
          fetchOrders()
        } else {
          router.push('/')
        }
      } catch (err) {
        router.push('/')
      }
    }

    checkAdmin()
  }, [user, router])

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
  }

  if (!isAdmin) {
    return null
  }

  const statusOptions = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Order ID</th>
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Total</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Payment</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{order._id}</td>
                <td className="py-3 px-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="py-3 px-4">${order.totalAmount.toFixed(2)}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    order.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                    disabled={updating === order._id}
                    className="px-2 py-1 border rounded"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
