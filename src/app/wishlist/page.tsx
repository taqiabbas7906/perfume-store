'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { formatPrice } from '@/lib/utils/format'
import { PageHeaderSkeleton, WishlistGridSkeleton } from '@/components/ui/Skeleton'

export default function WishlistPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { items, loading, remove } = useWishlist()
  const { addItem } = useCart()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?redirect=/wishlist')
  }, [user, authLoading, router])

  if (authLoading || (loading && items.length === 0)) {
    return (
      <main className="min-h-screen pt-32 pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <PageHeaderSkeleton />
          <WishlistGridSkeleton />
        </div>
      </main>
    )
  }

  async function moveToCart(productId: string, slug: string) {
    // Fetch the product to get a sellable SKU.
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

  return (
    <main className="min-h-screen pt-32 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
              <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
                Saved for Later
              </span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)]">
              Wishlist
            </h1>
            {items.length > 0 && (
              <p className="text-sm text-gray-500 font-light mt-2">
                {items.length} item{items.length === 1 ? '' : 's'} saved
              </p>
            )}
          </div>
          <Link
            href="/shop"
            className="text-[10px] tracking-[0.3em] uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors flex items-center gap-1.5"
          >
            <i className="ri-arrow-left-line text-sm" />
            Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 flex items-center justify-center border border-[var(--color-border)] rounded-full mx-auto mb-6">
              <i className="ri-heart-line text-4xl text-[var(--color-gold)]" />
            </div>
            <h2 className="font-serif text-2xl font-light text-[var(--color-ink)] mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-sm text-gray-400 tracking-wide mb-8">
              Save fragrances you love by tapping the heart icon.
            </p>
            <Link
              href="/shop"
              className="inline-block bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[11px] tracking-[0.3em] uppercase font-bold px-10 py-4 transition-all duration-300"
            >
              Browse Fragrances
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map(({ product, addedAt }) => {
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
                      className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-white text-red-500 transition-all duration-200"
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
                      onClick={() => moveToCart(product._id, product.slug)}
                      disabled={product.active === false}
                      className="mt-3 w-full bg-[var(--color-ink)] hover:bg-[var(--color-gold)] disabled:opacity-60 text-white text-[9px] tracking-widest uppercase font-bold py-2 transition-all duration-300"
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
    </main>
  )
}
