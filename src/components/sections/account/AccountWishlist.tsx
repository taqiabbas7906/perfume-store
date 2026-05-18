'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { formatPrice } from '@/lib/utils/format'
import { WishlistGridSkeleton } from '@/components/ui/Skeleton'

export default function AccountWishlist() {
  const { items, loading, remove } = useWishlist()
  const { addItem } = useCart()

  async function moveToCart(productId: string, slug: string) {
    try {
      const res = await fetch(`/api/products/${slug}`)
      const data = await res.json()
      const variant = data?.product?.variants?.find(
        (v: { quantity: number }) => v.quantity > 0,
      )
      if (!variant) return
      void addItem({
        productId,
        variantSku: variant.sku,
        quantity: 1,
        meta: {
          name: data.product.name,
          price: variant.discountedPrice ?? variant.originalPrice,
          image: data.product.images?.[0]?.url ?? '',
          variantLabel: variant.label,
          slug: data.product.slug,
          brand: data.product.brand,
        },
      })
    } catch {
      /* silent */
    }
  }

  if (loading && items.length === 0) return <WishlistGridSkeleton count={4} />

  return (
    <div>
      <div className="bg-white px-6 py-4 border-b border-[var(--color-border-soft)] mb-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] tracking-wide">
          My Wishlist
        </h2>
        <p className="text-[10px] text-gray-400 mt-0.5 tracking-wide">
          {items.length} saved item{items.length === 1 ? '' : 's'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 flex items-center justify-center border border-[var(--color-border)] rounded-full mb-4">
            <i className="ri-heart-line text-2xl text-[var(--color-gold)]" />
          </div>
          <p className="text-sm text-[var(--color-ink)] font-medium">
            Your wishlist is empty
          </p>
          <p className="text-xs text-gray-400 mt-1">Save fragrances you love</p>
          <Link
            href="/shop"
            className="mt-6 inline-block bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white text-xs tracking-widest uppercase font-bold px-8 py-3 transition-colors"
          >
            Browse Shop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map(({ product }) => {
            const img = product.images?.[0]?.url
            return (
              <div key={product._id} className="group bg-white relative">
                <Link
                  href={`/product/${product.slug}`}
                  className="block relative overflow-hidden bg-[var(--color-cream-500)] aspect-[3/4]"
                >
                  {img && (
                    <Image
                      src={img}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      remove(product._id)
                    }}
                    className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-white text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    aria-label="Remove from wishlist"
                  >
                    <i className="ri-heart-fill text-sm" />
                  </button>
                </Link>
                <div className="pt-3 pb-4 px-1">
                  {product.brand && (
                    <p className="text-[9px] text-[var(--color-gold)] tracking-[0.3em] uppercase font-bold">
                      {product.brand}
                    </p>
                  )}
                  <h3 className="text-xs font-semibold text-[var(--color-ink)] mt-0.5 line-clamp-2">
                    {product.name}
                  </h3>
                  {typeof product.minPrice === 'number' && (
                    <p className="text-xs font-bold text-[var(--color-ink)] mt-2">
                      {formatPrice(product.minPrice)}
                    </p>
                  )}
                  <button
                    onClick={() => moveToCart(product._id, product.slug)}
                    className="mt-3 w-full bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[9px] tracking-widest uppercase font-bold py-2 transition-all duration-300"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
