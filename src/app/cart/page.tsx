'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { smartFetch } from '@/lib/api'
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

interface CartVoucher {
  code: string
  voucherId: string
  discount: number
}

interface CartSummary {
  items: CartItem[]
  subtotal: number
  total: number
  itemCount: number
  discount: number
  vouchers: CartVoucher[]
}

export default function CartPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [cart, setCart] = useState<CartSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [applyingVoucher, setApplyingVoucher] = useState(false)

  const fetchCart = async (params?: { voucherCode?: string; removeVoucher?: string }) => {
    try {
      const searchParams = new URLSearchParams()
      if (params?.voucherCode) searchParams.set('voucherCode', params.voucherCode)
      if (params?.removeVoucher) searchParams.set('removeVoucher', params.removeVoucher)
      const url = searchParams.toString() ? `/api/cart?${searchParams.toString()}` : '/api/cart'
      const res = await smartFetch(url)
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

  const removeVoucher = async (code: string) => {
    await fetchCart({ removeVoucher: code })
  }

  const applyVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherCode.trim()) return
    setApplyingVoucher(true)
    setError('')
    
    try {
      const validateRes = await smartFetch('/api/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: voucherCode.trim(),
          cartTotal: cart?.subtotal || 0,
          productIds: cart?.items.map(i => i.productId) || [],
        }),
      })
      const validateData = await validateRes.json()
      
      if (!validateRes.ok) {
        setError(validateData.error || 'Invalid voucher')
        setApplyingVoucher(false)
        return
      }
      
      if (!validateData.success) {
        setError(validateData.error || 'Invalid voucher')
        setApplyingVoucher(false)
        return
      }
      
      await fetchCart({ voucherCode: voucherCode.trim() })
      setVoucherCode('')
    } catch (err) {
      setError('Failed to apply voucher')
    } finally {
      setApplyingVoucher(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    fetchCart()
  }, [user, authLoading, router])

  const updateQuantity = async (sku: string, newQuantity: number) => {
    if (newQuantity < 1) return

    const originalItems = cart?.items || []
    const optimisticItems = originalItems.map(item => 
      item.variantSku === sku ? { ...item, quantity: newQuantity } : item
    )
    
    setCart(prev => prev ? { ...prev, items: optimisticItems } : null)
    setUpdating(sku)

    try {
      const res = await smartFetch(`/api/cart/items/${sku}`, {
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
      const res = await smartFetch(`/api/cart/items/${sku}`, {
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

  if (authLoading || loading) {
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
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={applyVoucher} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Voucher code"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                type="submit"
                disabled={applyingVoucher || !voucherCode.trim()}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </form>
          
          {cart?.vouchers?.map((voucher) => (
            <div key={voucher.code} className="flex justify-between items-center mb-2 text-green-600">
              <span>{voucher.code}</span>
              <div className="flex items-center gap-2">
                <span>-${voucher.discount.toFixed(2)}</span>
                <button
                  onClick={() => removeVoucher(voucher.code)}
                  className="text-red-500 hover:underline text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>${cart?.subtotal.toFixed(2)}</span>
          </div>
          
          {cart?.discount > 0 && (
            <div className="flex justify-between mb-2 text-green-600">
              <span>Total Discount</span>
              <span>-${cart.discount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span>
            <span>${cart?.total.toFixed(2)}</span>
          </div>
          <Link href="/checkout" className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 text-center block mt-6">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}
