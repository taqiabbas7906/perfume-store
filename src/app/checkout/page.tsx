'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface CartItem {
  productId: string
  variantSku: string
  quantity: number
  price: number
  name?: string
  variantLabel?: string
  image?: string
  addedAt?: string
}

interface CartSummary {
  items: CartItem[]
  subtotal: number
  total: number
  itemCount: number
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
  const [guestEmail, setGuestEmail] = useState('')
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    holderName: '',
  })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

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
    if (user && user.email) {
      setGuestEmail(user.email)
    }
    fetchCart()
  }, [user])

  const generateIdempotencyKey = () => {
    return crypto.randomUUID()
  }

  const handleCreateOrderAndPay = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')

    try {
      const idempotencyKey = generateIdempotencyKey()
      const orderBody: any = {
        items: cart?.items.map(i => ({ productId: i.productId, variantSku: i.variantSku, quantity: i.quantity })) || [],
        shippingAddress,
        idempotencyKey,
      }
      if (guestEmail && !user) {
        orderBody.guestEmail = guestEmail
      }

      const orderRes = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderBody),
      })
      const orderData = await orderRes.json()
      if (!orderData.success) {
        setError(orderData.error || 'Failed to create order')
        setProcessing(false)
        return
      }

      const newOrderId = orderData.order._id
      setOrderId(newOrderId)

      const paymentRes = await authFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: newOrderId,
          sourceId: 'cnon:card-nonce-ok',
          idempotencyKey: generateIdempotencyKey(),
        }),
      })
      const paymentData = await paymentRes.json()

      if (paymentData.success) {
        setPaymentSuccess(true)
      } else {
        setError(paymentData.error || 'Payment failed')
      }
    } catch (err) {
      setError('Failed to process payment')
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

  if (paymentSuccess) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Payment Successful!</h1>
        <p className="mb-4">Thank you for your purchase!</p>
        <p className="mb-4">Order ID: {orderId}</p>
        <button
          onClick={() => router.push('/products')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleCreateOrderAndPay} className="space-y-4">
            {!user && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            )}

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

            <div className="border-t pt-4">
              <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Card Holder Name</label>
                  <input
                    type="text"
                    required
                    value={cardDetails.holderName}
                    onChange={(e) => setCardDetails({ ...cardDetails, holderName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardDetails.number}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '')
                      val = val.match(/.{1,4}/g)?.join(' ') || val
                      setCardDetails({ ...cardDetails, number: val })
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="4111 1111 1111 1111"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry Date (MM/YY)</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={cardDetails.expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '')
                        if (val.length >= 2) {
                          val = val.slice(0, 2) + '/' + val.slice(2)
                        }
                        setCardDetails({ ...cardDetails, expiry: val })
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="12/28"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CVV</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={cardDetails.cvv}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setCardDetails({ ...cardDetails, cvv: val })
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm mt-2">
                Using Square sandbox. Test card: 4111 1111 1111 1111
              </p>
            </div>
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Pay $${cart.total.toFixed(2)}`}
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
