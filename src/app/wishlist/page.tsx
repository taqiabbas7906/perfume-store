'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { PageHeaderSkeleton, WishlistGridSkeleton } from '@/components/ui/Skeleton'
import WishlistProductCard from '@/components/product/WishlistProductCard'

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
        <header className="mb-10 flex items-end justify-between flex-wrap gap-4">
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
        </header>

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
            {items.map(({ product, addedAt }) => (
              <WishlistProductCard
                key={product._id}
                product={product}
                addedAt={addedAt}
                onRemove={remove}
                onMoveToCart={moveToCart}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
