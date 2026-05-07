'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  brand: string
  category: string
  minPrice: number
  maxPrice: number
  images: Array<{ url: string; alt?: string }>
  variants: Array<{ sku: string; label: string; originalPrice: number; discountedPrice?: number; quantity: number }>
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products')
        const data = await res.json()
        if (data.success) {
          setProducts(data.products)
        } else {
          setError(data.error || 'Failed to load products')
        }
      } catch (err) {
        setError('Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
  }

  if (error) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Our Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => {
          // Check if any variant has a discount
          const hasDiscount = product.variants.some(v => 
            v.discountedPrice && v.discountedPrice < v.originalPrice
          )
          
          // Calculate highest discount percentage across all variants
          const discountPercentages = product.variants
            .filter(v => v.discountedPrice && v.discountedPrice < v.originalPrice)
            .map(v => Math.round(((v.originalPrice - v.discountedPrice!) / v.originalPrice) * 100))
          
          const maxDiscount = discountPercentages.length > 0 ? Math.max(...discountPercentages) : 0
          
          // Calculate min/max prices considering discounts
          const discountedPrices = product.variants.map(v => v.discountedPrice ?? v.originalPrice)
          const minDiscountedPrice = Math.min(...discountedPrices)
          const maxDiscountedPrice = Math.max(...discountedPrices)
          
          // Calculate original price range
          const originalPrices = product.variants.map(v => v.originalPrice)
          const minOriginalPrice = Math.min(...originalPrices)
          const maxOriginalPrice = Math.max(...originalPrices)
          
          return (
            <Link
              key={product._id}
              href={`/products/${product.slug}`}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow hover:scale-105 transition-transform duration-200"
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                {product.images[0] ? (
                  <img
                    src={product.images[0].url}
                    alt={product.images[0].alt || product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400">No image</span>
                )}
                
                {/* Discount Badge */}
                {hasDiscount && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {maxDiscount}% OFF
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500">{product.brand}</p>
                <h2 className="text-lg font-semibold mb-1">{product.name}</h2>
                
                {/* Price Display */}
                <div className="space-y-1">
                  {/* Discounted Price */}
                  <p className="text-lg font-bold text-green-600">
                    ${minDiscountedPrice.toFixed(2)}
                    {maxDiscountedPrice > minDiscountedPrice && ` - $${maxDiscountedPrice.toFixed(2)}`}
                  </p>
                  
                  {/* Original Price with Strikethrough */}
                  {hasDiscount && (
                    <p className="text-sm text-gray-500 line-through">
                      ${minOriginalPrice.toFixed(2)}
                      {maxOriginalPrice > minOriginalPrice && ` - $${maxOriginalPrice.toFixed(2)}`}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
