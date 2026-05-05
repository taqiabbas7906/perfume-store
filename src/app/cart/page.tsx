'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface CartItem {
  productId: string
  variantSku: string
  name: string
  variantLabel: string
  price: number
  quantity: number
  image?: string
}

interface CartSummary {
  items: CartItem[]
  subtotal: number
  total: number
  itemCount: number
}

export default function CartPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [cart, setCart] = useState<CartSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')

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

  const updateQuantity = async (sku: string, newQuantity: number) => {
    if (newQuantity < 1) return

    const originalItems = cart?.items || []
    const optimisticItems = originalItems.map(item => 
      item.variantSku === sku ? { ...item, quantity: newQuantity } : item
    )
    
    setCart(prev => prev ? { ...prev, items: optimisticItems } : null)
    setUpdating(sku)

    try {
      const res = await authFetch(`/api/cart/items/${sku}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQuantity }),
      })
      const data = await res.json()
      if (data.success) {
        setCart(data)
      } else {
        setError(data.error || 'Failed to update quantity')
        setCart(prev => prev ? { ...prev, items: originalItems } : null)
      }
    } catch (err) {
      setError('Failed to update quantity')
      setCart(prev => prev ? { ...prev, items: originalItems } : null)
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (sku: string) => {
    const originalItems = cart?.items || []
    const optimisticItems = originalItems.filter(item => item.variantSku !== sku)
    
    setCart(prev => prev ? { ...prev, items: optimisticItems } : null)
    setUpdating(sku)

    try {
      const res = await authFetch(`/api/cart/items/${sku}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setCart(data)
      } else {
        setError(data.error || 'Failed to remove item')
        setCart(prev => prev ? { ...prev, items: originalItems } : null)
      }
    } catch (err) {
      setError('Failed to remove item')
      setCart(prev => prev ? { ...prev, items: originalItems } : null)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
  }

  if (error && !cart) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-500">{error}</div>
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/products" className="text-blue-600 hover:underline">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {cart.items.map((item) => (
            <div key={item.variantSku} className="flex gap-4 py-4 border-b">
              <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                ) : (
                  <span className="text-gray-400">No image</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-gray-600">{item.variantLabel}</p>
                <p className="font-bold mt-1">${item.price.toFixed(2)}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.variantSku, item.quantity - 1)}
                      disabled={updating === item.variantSku}
                      className="px-3 py-1 border rounded"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantSku, item.quantity + 1)}
                      disabled={updating === item.variantSku}
                      className="px-3 py-1 border rounded"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.variantSku)}
                    disabled={updating === item.variantSku}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right font-bold">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="border rounded-lg p-6 h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>
          <Link href="/checkout" className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 text-center block mt-6">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}
