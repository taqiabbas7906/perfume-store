'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { smartFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/utils/format'
import type { StorefrontProduct } from '@/types/storefront'

interface ProductCardProps {
  product: StorefrontProduct
  badge?: 'HOT' | 'NEW' | 'SALE' | 'BESTSELLER'
  priority?: boolean
}

const BADGE_COLORS: Record<string, string> = {
  HOT: 'bg-red-500',
  NEW: 'bg-[var(--color-ink-muted)]',
  SALE: 'bg-[var(--color-gold)]',
  BESTSELLER: 'bg-emerald-800',
}

export default function ProductCard({ product, badge, priority }: ProductCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { addItem } = useCart()
  const [hovered, setHovered] = useState(false)
  const [wished, setWished] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const primaryVariant = product.variants?.[0]
  const original = primaryVariant?.originalPrice ?? product.maxPrice
  const current =
    primaryVariant?.discountedPrice ?? primaryVariant?.originalPrice ?? product.minPrice
  const discount =
    original && current && original > current
      ? Math.round(((original - current) / original) * 100)
      : 0
  const image = product.images?.[0]?.url
  const stars = product.ratingAverage ?? 0
  const reviews = product.ratingCount ?? 0
  const effectiveBadge =
    badge ?? (product.isLimitedEdition ? 'NEW' : product.featured ? 'BESTSELLER' : undefined)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (!primaryVariant) return
    setBusy(true)
    const r = await addItem({
      productId: product._id,
      variantSku: primaryVariant.sku,
      quantity: 1,
    })
    setBusy(false)
    if (!r.ok) setToast(r.error ?? 'Could not add')
  }

  async function handleWishlist(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) {
      router.push('/login')
      return
    }
    try {
      const next = !wished
      setWished(next)
      if (next) {
        await smartFetch('/api/wishlist', {
          method: 'POST',
          body: JSON.stringify({ productId: product._id }),
        })
      } else {
        await smartFetch(`/api/wishlist/${product._id}`, {
          method: 'DELETE',
        })
      }
    } catch {
      setWished((v) => !v)
    }
  }

  return (
    <div
      className="group bg-white cursor-pointer relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/product/${product.slug}`)}
    >
      <div className="relative overflow-hidden bg-[var(--color-cream-500)] aspect-[3/4]">
        {effectiveBadge && (
          <span
            className={`absolute top-3 left-3 z-10 text-[9px] font-bold tracking-widest uppercase text-white px-2 py-0.5 ${
              BADGE_COLORS[effectiveBadge] ?? 'bg-[var(--color-ink)]'
            }`}
          >
            {effectiveBadge}
          </span>
        )}

        {discount > 0 && (
          <span className="absolute top-3 right-3 z-10 text-[9px] font-bold text-[var(--color-gold)] bg-white px-1.5 py-0.5">
            -{discount}%
          </span>
        )}

        {image && (
          <Image
            src={image}
            alt={product.images?.[0]?.alt || product.name}
            fill
            sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="object-cover object-top transition-transform duration-700"
            style={{ transform: hovered ? 'scale(1.07)' : 'scale(1)' }}
          />
        )}

        <button
          onClick={handleWishlist}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-9 right-3 z-10 w-7 h-7 flex items-center justify-center transition-all duration-300 ${
            wished ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <i
            className={`${
              wished ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-[var(--color-ink)]'
            } text-base`}
          />
        </button>

        <button
          onClick={handleAdd}
          disabled={busy || !primaryVariant || primaryVariant.quantity < 1}
          className={`absolute bottom-0 left-0 right-0 bg-[var(--color-gold)] py-3 text-center text-white text-[10px] tracking-widest uppercase font-bold transition-all duration-350 disabled:opacity-70 ${
            hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
          }`}
        >
          <i className="ri-shopping-bag-line mr-1.5" />
          {primaryVariant && primaryVariant.quantity < 1
            ? 'Out of Stock'
            : busy
              ? 'Adding…'
              : 'Add to Cart'}
        </button>

        {toast && (
          <div className="absolute inset-x-3 bottom-14 z-20 bg-[var(--color-ink)] text-white text-[10px] tracking-widest uppercase px-3 py-2 text-center animate-fadeIn">
            {toast}
          </div>
        )}
      </div>

      <Link href={`/product/${product.slug}`} className="block pt-3 pb-4 px-1">
        <p className="text-[9px] text-[var(--color-gold)] tracking-[0.3em] uppercase font-bold">
          {product.brand}
        </p>
        <h3 className="text-xs font-semibold text-[var(--color-ink)] mt-0.5 leading-snug line-clamp-2">
          {product.name}
        </h3>
        {primaryVariant?.label && (
          <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
            {primaryVariant.label}
          </p>
        )}

        <div className="flex items-center gap-0.5 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <i
              key={i}
              className={`text-[9px] ${
                i < Math.floor(stars)
                  ? 'ri-star-fill text-[var(--color-gold)]'
                  : 'ri-star-line text-gray-300'
              }`}
            />
          ))}
          <span className="text-[9px] text-gray-400 ml-1">({reviews})</span>
        </div>

        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-sm font-bold text-[var(--color-ink)]">
            {formatPrice(current)}
          </span>
          {original > current && (
            <span className="text-[10px] text-gray-400 line-through">
              {formatPrice(original)}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
