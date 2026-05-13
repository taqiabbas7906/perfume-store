'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface WishlistProduct {
  _id: string
  name: string
  slug: string
  brand: string
  minPrice: number
  images: Array<{ url: string; alt?: string }>
  active: boolean
}

interface WishlistItem {
  productId: WishlistProduct
  addedAt: string
}

export default function WishlistPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [items, setItems]         = useState<WishlistItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [removing, setRemoving]   = useState<string | null>(null)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }

    authFetch('/api/wishlist')
      .then(r => r.json())
      .then(d => {
        if (d.items) setItems(d.items)
        else setError(d.error || 'Failed to load wishlist')
      })
      .catch(() => setError('Failed to load wishlist'))
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  const removeItem = async (productId: string) => {
    setRemoving(productId)
    try {
      const res = await authFetch(`/api/wishlist/${productId}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        setItems(prev => prev.filter(i => i.productId._id !== productId))
      } else {
        setError(d.error || 'Failed to remove item')
      }
    } catch {
      setError('Failed to remove item')
    } finally {
      setRemoving(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wishlist</h1>
          {items.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
          )}
        </div>
        <Link href="/products" className="text-sm text-gray-500 hover:text-gray-900 underline">
          ← Continue Shopping
        </Link>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">♡</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Your wishlist is empty</h2>
          <p className="text-sm mb-6">Save products you love by clicking the ♡ on any product page.</p>
          <Link
            href="/products"
            className="inline-block bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => {
            const p = item.productId
            return (
              <div key={p._id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                {/* Image */}
                <Link href={`/products/${p.slug}`} className="block aspect-square bg-gray-50 overflow-hidden">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0].url}
                      alt={p.images[0].alt || p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">◻</div>
                  )}
                </Link>

                {/* Info */}
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-0.5">{p.brand}</p>
                  <Link href={`/products/${p.slug}`} className="font-semibold text-gray-900 hover:underline block truncate">
                    {p.name}
                  </Link>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    From ${p.minPrice?.toFixed(2) ?? '—'}
                  </p>
                  {!p.active && (
                    <p className="text-xs text-red-500 mt-1">Currently unavailable</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Saved {new Date(item.addedAt).toLocaleDateString()}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/products/${p.slug}`}
                      className="flex-1 text-center py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      View Product
                    </Link>
                    <button
                      onClick={() => removeItem(p._id)}
                      disabled={removing === p._id}
                      title="Remove from wishlist"
                      className="w-10 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      {removing === p._id ? (
                        <span className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : '♥'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
