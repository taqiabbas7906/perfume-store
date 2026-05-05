'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface CartSummary {
  items: any[]
  subtotal: number
  total: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [cart, setCart] = useState<CartSummary | null>(null)
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    zip: '',
  })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)

  const fetchCart = async () => {
    try {
      const res = await authFetch('/api/cart')
      const data = await res.json()
      if (data.success) {
        setCart(data)
      } else {
        setError(data.error || 'Failed to load cart')
      }
    } catch (err) {
      setError('Failed to load cart')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchCart()
  }, [user, router])

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')

    try {
      const res = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart?.items.map(i => ({ productId: i.productId, variantSku: i.variantSku, quantity: i.quantity })) || [],
          shippingAddress,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrderId(data.order._id)
      } else {
        setError(data.error || 'Failed to create order')
      }
    } catch (err) {
      setError('Failed to create order')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
  }

  if (error && !cart) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-500">{error}</div>
  }

  if (!cart || cart.items.length === 0) {
    router.push('/cart')
    return null
  }

  if (orderId) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Order Created!</h1>
        <p className="mb-4">Your order ID is: {orderId}</p>
        <p className="text-gray-600">Payment integration coming soon!</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <h2 className="text-xl font-semibold">Shipping Address</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                required
                value={shippingAddress.name}
                onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                required
                value={shippingAddress.address}
                onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP Code</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.zip}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                type="text"
                required
                value={shippingAddress.country}
                onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? 'Creating Order...' : 'Place Order'}
            </button>
            {error && <p className="text-red-600">{error}</p>}
          </form>
        </div>
        <div className="border rounded-lg p-6 h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          {cart.items.map((item) => (
            <div key={item.variantSku} className="flex justify-between mb-2">
              <span>{item.name} x {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
