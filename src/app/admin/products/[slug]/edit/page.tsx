'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import ProductForm, { type InitialProduct } from '@/components/admin/panels/ProductForm'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function EditProductPage({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [product, setProduct] = useState<InitialProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await authFetch(`/api/admin/products/${slug}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.success) {
          if (res.status === 403) {
            router.push('/')
            return
          }
          throw new Error(data.error || 'Failed to load product')
        }
        setProduct(data.product as InitialProduct)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load product')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center text-gold-600 text-2xl">
            <i className="ri-loader-4-line animate-spin" />
          </div>
          <p className="text-sm text-charcoal-500">Loading product…</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
          Product not found
        </h1>
        <p className="text-sm text-charcoal-500 mb-6">
          {error || 'This product no longer exists.'}
        </p>
        <Link
          href="/admin/products"
          className="inline-block bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors"
        >
          Back to Products
        </Link>
      </div>
    )
  }

  return <ProductForm initial={product} />
}
