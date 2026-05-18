'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { WishlistProduct } from '@/context/WishlistContext'
import { formatPrice } from '@/lib/utils/format'

interface WishlistProductCardProps {
  product: WishlistProduct
  addedAt?: string
  onRemove: (productId: string) => void
  onMoveToCart: (productId: string, slug: string) => void
}

export default function WishlistProductCard({
  product,
  addedAt,
  onRemove,
  onMoveToCart,
}: WishlistProductCardProps) {
  const img = product.images?.[0]?.url

  return (
    <article className="group bg-white relative">
      <div className="relative overflow-hidden bg-[var(--color-cream-500)] aspect-[3/4]">
        <Link
          href={`/product/${product.slug}`}
          className="absolute inset-0 block"
          aria-label={`View ${product.name}`}
        >
          {img && (
            <Image
              src={img}
              alt={product.images?.[0]?.alt || product.name}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          )}
        </Link>
        <button
          type="button"
          onClick={() => onRemove(product._id)}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-white text-red-500 transition-all duration-200"
          aria-label="Remove from wishlist"
        >
          <i className="ri-heart-fill text-sm" aria-hidden="true" />
        </button>
      </div>

      <div className="pt-3 pb-4 px-1">
        {product.brand && (
          <p className="text-[9px] text-[var(--color-gold)] tracking-[0.3em] uppercase font-bold">
            {product.brand}
          </p>
        )}
        <Link
          href={`/product/${product.slug}`}
          className="block text-xs font-semibold text-[var(--color-ink)] mt-0.5 hover:text-[var(--color-gold)] transition-colors line-clamp-2"
        >
          {product.name}
        </Link>
        {typeof product.minPrice === 'number' && (
          <p className="text-xs font-bold text-[var(--color-ink)] mt-2">
            From {formatPrice(product.minPrice)}
          </p>
        )}
        {product.active === false && (
          <p className="text-[10px] text-red-500 mt-1 tracking-wide">
            Currently unavailable
          </p>
        )}
        {addedAt && (
          <p className="text-[10px] text-gray-400 mt-1">
            Saved {new Date(addedAt).toLocaleDateString()}
          </p>
        )}
        <button
          type="button"
          onClick={() => onMoveToCart(product._id, product.slug)}
          disabled={product.active === false}
          className="mt-3 w-full bg-[var(--color-ink)] hover:bg-[var(--color-gold)] disabled:opacity-60 text-white text-[9px] tracking-widest uppercase font-bold py-2 transition-all duration-300"
        >
          Add to Cart
        </button>
      </div>
    </article>
  )
}
