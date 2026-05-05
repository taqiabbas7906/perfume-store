'use client'

import { useState } from 'react'

export default function TestCommercePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const userId = '000000000000000000000001' // fake test user

  /* ───────────────────────── CART ───────────────────────── */

  const addToCart = async () => {
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: '64f1c2a9c123456789abcdef',
        variantSku: 'TEST-SKU-1',
        quantity: 1,
      }),
    })

    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  /* ───────────────────────── ORDER ───────────────────────── */

  const createOrder = async () => {
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        shippingAddress: {
          name: 'Test User',
          address: 'Test Street 123',
          city: 'Test City',
          country: 'Test Country',
          zip: '12345',
        },
        idempotencyKey: crypto.randomUUID(),
      }),
    })

    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  /* ───────────────────────── PAYMENT ───────────────────────── */

  const payOrder = async () => {
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: result?.order?._id,
        sourceId: 'cnon:card-nonce-ok', // Square sandbox test nonce
        idempotencyKey: crypto.randomUUID(),
      }),
    })

    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div style={{ padding: 30, fontFamily: 'sans-serif' }}>
      <h1>🧪 Commerce Test Page</h1>

      {/* BUTTONS */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={addToCart} disabled={loading}>
          Add to Cart
        </button>

        <button onClick={createOrder} disabled={loading}>
          Create Order
        </button>

        <button onClick={payOrder} disabled={loading}>
          Pay Order
        </button>
      </div>

      {/* LOADING */}
      {loading && <p style={{ marginTop: 20 }}>Processing...</p>}

      {/* RESULT */}
      {result && (
        <pre
          style={{
            marginTop: 20,
            background: '#111',
            color: '#0f0',
            padding: 15,
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      {/* SUCCESS CHECK */}
      {result?.success && (
        <h2 style={{ color: 'green', marginTop: 20 }}>
          ✅ Flow Completed Successfully
        </h2>
      )}
    </div>
  )
}