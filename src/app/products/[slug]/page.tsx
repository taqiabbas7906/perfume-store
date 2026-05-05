'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  brand: string
  category: string
  images: Array<{ url: string; alt?: string }>
  variants: Array<{ sku: string; label: string; originalPrice: number; discountedPrice?: number; quantity: number }>
}

export default function ProductDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${slug}`)
        const data = await res.json()
        if (data.success) {
          setProduct(data.product)
          if (data.product.variants.length > 0) {
            setSelectedVariant(data.product.variants[0].sku)
          }
        } else {
          setError(data.error || 'Failed to load product')
        }
      } catch (err) {
        setError('Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchProduct()
    }
  }, [slug])

  const handleAddToCart = async () => {
    if (!product || !selectedVariant || !user) {
      if (!user) {
        router.push('/login')
      }
      return
    }

    setAddingToCart(true)
    setError('')
    setSuccess('')

    try {
      const res = await authFetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId: product._id,
          variantSku: selectedVariant,
          quantity,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess('Added to cart!')
      } else {
        setError(data.error || 'Failed to add to cart')
      }
    } catch (err) {
      setError('Failed to add to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
  }

  if (error && !product) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-500">{error}</div>
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-8 text-center">Product not found</div>
  }

  const variant = product.variants.find(v => v.sku === selectedVariant)
  const price = variant ? (variant.discountedPrice ?? variant.originalPrice) : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/products" className="text-blue-600 hover:underline mb-4 inline-block">← Back to products</Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          {product.images[0] ? (
            <img
              src={product.images[0].url}
              alt={product.images[0].alt || product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
          )}
        </div>
        <div>
          <p className="text-gray-500">{product.brand}</p>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-2xl font-bold mb-6">${price.toFixed(2)}</p>
          <p className="text-gray-700 mb-6">{product.description}</p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Variant</label>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.sku}
                  onClick={() => setSelectedVariant(v.sku)}
                  disabled={v.quantity === 0}
                  className={`px-4 py-2 border rounded-lg ${
                    selectedVariant === v.sku
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${v.quantity === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              max={variant?.quantity || 1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-24 px-3 py-2 border rounded-lg"
            />
          </div>

          <button
            onClick={handleAddToCart}
            disabled={addingToCart || !variant || variant.quantity === 0}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </button>

          {success && <p className="mt-4 text-green-600">{success}</p>}
          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
