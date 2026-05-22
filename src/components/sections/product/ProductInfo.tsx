'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/utils/format'
import { useStoreSettings } from '@/lib/useStoreSettings'
import type { StorefrontProduct } from '@/types/storefront'

interface ProductInfoProps {
  product: StorefrontProduct
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { addItem } = useCart()
  const { has: hasWish, toggle: toggleWish } = useWishlist()
  const { settings } = useStoreSettings()
  const variants = product.variants ?? []

  /**
   * Show the "Free Shipping" badge under Add to Cart when ANY of:
   *  - the product itself is flagged `freeDelivery`
   *  - the store has free delivery on for ALL orders (enabled + no threshold)
   * For threshold-based stores, we deliberately don't show the badge here —
   * the cart progress bar communicates the threshold instead, so we don't
   * promise something the customer hasn't yet earned.
   */
  const globalFreeForAll =
    settings.freeDelivery.enabled && (settings.freeDelivery.threshold ?? 0) <= 0
  const showsFreeShippingBadge = product.freeDelivery === true || globalFreeForAll
  const [selectedSku, setSelectedSku] = useState(variants[0]?.sku ?? '')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const wished = hasWish(product._id)

  const variant =
    variants.find((v) => v.sku === selectedSku) ?? variants[0]
  if (!variant) {
    return (
      <p className="text-sm text-gray-400">This product is not available.</p>
    )
  }

  const price = variant.discountedPrice ?? variant.originalPrice
  const original = variant.originalPrice
  const discount =
    original > price ? Math.round(((original - price) / original) * 100) : 0
  const rating = product.ratingAverage ?? 0
  const reviewCount = product.ratingCount ?? 0
  const tags = product.tags ?? []

  function handleAddToCart() {
    void addItem({
      productId: product._id,
      variantSku: variant.sku,
      quantity: qty,
      meta: {
        name: product.name,
        price: price,
        image: product.images?.[0]?.url ?? '',
        variantLabel: variant.label,
        slug: product.slug,
        brand: product.brand,
      },
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  function handleWishlist() {
    if (!user) {
      router.push('/login')
      return
    }
    toggleWish(product._id, {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      minPrice: product.minPrice,
      active: true,
      images: product.images,
    })
  }

  const isFragrance = product.productType === 'perfume'

  const attrs = (product.attributes ?? {}) as Record<string, unknown>
  const attr = (k: string) => (typeof attrs[k] === 'string' ? (attrs[k] as string) : '')
  const tagline = attr('tagline')

  // Longevity is now stored as hours (number). Old products may still hold
  // qualitative strings — show those as-is so they remain readable.
  const longevityValue = (() => {
    const raw = attrs.longevity
    if (typeof raw === 'number' && raw > 0) {
      return `${raw % 1 === 0 ? raw : raw.toFixed(1)} Hr`
    }
    if (typeof raw === 'string') {
      if (/^\d+(\.\d+)?$/.test(raw)) return `${raw} Hr`
      return raw
    }
    return ''
  })()

  const fragranceSpecs = isFragrance
    ? [
        { label: 'Concentration', value: attr('concentration'), icon: 'ri-drop-line' },
        { label: 'Longevity', value: longevityValue, icon: 'ri-time-line' },
        { label: 'Sillage', value: attr('sillage'), icon: 'ri-blur-off-line' },
        { label: 'Season', value: attr('season'), icon: 'ri-sun-line' },
        { label: 'Gender', value: attr('gender'), icon: 'ri-user-3-line' },
      ].filter((s) => s.value)
    : []

  const genericSpecs = [
    { label: 'Brand', value: product.brand, icon: 'ri-shopping-bag-line' },
    { label: 'Category', value: product.category, icon: 'ri-price-tag-3-line' },
    {
      label: 'In Stock',
      value: variant.quantity > 0 ? 'Yes' : 'No',
      icon: 'ri-checkbox-circle-line',
    },
    {
      label: 'Free Delivery',
      value: product.freeDelivery ? 'Yes' : 'Standard',
      icon: 'ri-truck-line',
    },
  ]

  const specs =
    isFragrance && fragranceSpecs.length > 0 ? fragranceSpecs : genericSpecs

  const detailsHeading = isFragrance ? 'Fragrance Details' : 'Product Details'
  const descriptionHeading = isFragrance
    ? 'About this Fragrance'
    : 'About this Product'

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold tracking-[0.35em] uppercase text-[var(--color-gold)]">
          {product.brand}
        </span>
        <span className="w-1 h-1 rounded-full bg-[var(--color-gold-soft)]" />
        <span className="text-[10px] tracking-widest uppercase text-gray-400">
          {product.category}
        </span>
      </div>

      <div>
        <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[var(--color-ink)] leading-tight">
          {product.name}
        </h1>
        {tagline && (
          <p className="text-sm text-[var(--color-ink-muted)] mt-1.5 italic">
            {tagline}
          </p>
        )}
      </div>

      {reviewCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <i
                key={i}
                className={`text-sm ${
                  i < Math.floor(rating)
                    ? 'ri-star-fill text-[var(--color-gold)]'
                    : i < rating
                      ? 'ri-star-half-fill text-[var(--color-gold)]'
                      : 'ri-star-line text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            {rating.toFixed(1)}
          </span>
          <a
            href="#reviews"
            className="text-xs text-[var(--color-gold)] hover:underline"
          >
            ({reviewCount} reviews)
          </a>
        </div>
      )}

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-[var(--color-ink)]">
          {formatPrice(price)}
        </span>
        {discount > 0 && (
          <>
            <span className="text-base text-gray-400 line-through">
              {formatPrice(original)}
            </span>
            <span className="text-xs font-bold text-white bg-[var(--color-gold)] px-2 py-0.5">
              -{discount}% OFF
            </span>
          </>
        )}
      </div>

      <div className="h-px bg-[var(--color-border-soft)]" />

      {variants.length > 1 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--color-ink)] mb-3">
            Size
          </p>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((v) => (
              <button
                key={v.sku}
                onClick={() => setSelectedSku(v.sku)}
                disabled={v.quantity < 1}
                className={`px-4 py-2.5 border text-xs font-medium tracking-wide transition-all duration-200 whitespace-nowrap ${
                  v.sku === selectedSku
                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]'
                } ${v.quantity < 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {v.label}
                {v.quantity < 1 && ' (Out)'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-[var(--color-ink)] mb-3">
          Quantity
        </p>
        <div className="flex items-center border border-[var(--color-border)] w-fit">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-[var(--color-ink)] hover:bg-[var(--color-cream-300)] transition-colors"
            aria-label="Decrease quantity"
          >
            <i className="ri-subtract-line" />
          </button>
          <span className="w-10 h-10 flex items-center justify-center text-sm font-semibold text-[var(--color-ink)] border-x border-[var(--color-border)]">
            {qty}
          </span>
          <button
            onClick={() =>
              setQty((q) => Math.min(Math.max(variant.quantity, 1), q + 1))
            }
            className="w-10 h-10 flex items-center justify-center text-[var(--color-ink)] hover:bg-[var(--color-cream-300)] transition-colors"
            aria-label="Increase quantity"
          >
            <i className="ri-add-line" />
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={variant.quantity < 1}
          className={`flex-1 h-12 flex items-center justify-center gap-2 font-bold text-xs tracking-widest uppercase whitespace-nowrap transition-all duration-300 disabled:opacity-70 ${
            added
              ? 'bg-emerald-700 text-white'
              : 'bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white'
          }`}
        >
          {added ? (
            <>
              <i className="ri-check-line text-base" />
              Added to Bag!
            </>
          ) : variant.quantity < 1 ? (
            'Out of Stock'
          ) : (
            <>
              <i className="ri-shopping-bag-line text-base" />
              Add to Bag
            </>
          )}
        </button>
        <button
          onClick={handleWishlist}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`w-12 h-12 flex items-center justify-center border transition-all duration-200 ${
            wished
              ? 'border-red-400 bg-red-50 text-red-500'
              : 'border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]'
          }`}
        >
          <i className={`text-lg ${wished ? 'ri-heart-fill' : 'ri-heart-line'}`} />
        </button>
      </div>

      {(() => {
        /** Free Shipping appears when the per-product `freeDelivery` flag
         *  is on OR when the store is offering free delivery on every
         *  order (enabled with no threshold). Threshold-based stores
         *  defer to the cart progress bar instead. */
        const badges = [
          { icon: 'ri-shield-check-line', label: '100% Authentic' },
          ...(showsFreeShippingBadge
            ? [{ icon: 'ri-truck-line', label: 'Free Shipping' }]
            : []),
          { icon: 'ri-exchange-line', label: 'Easy Returns' },
        ]
        return (
          <div
            className={`grid gap-2 pt-1 ${
              badges.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
            }`}
          >
            {badges.map((b) => (
              <div
                key={b.label}
                className="flex flex-col items-center gap-1 py-3 bg-[var(--color-cream-100)] border border-[var(--color-border-soft)]"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className={`${b.icon} text-sm text-[var(--color-gold)]`} />
                </div>
                <span className="text-[9px] text-[var(--color-ink-muted)] tracking-wide text-center font-medium">
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        )
      })()}

      <div className="h-px bg-[var(--color-border-soft)]" />

      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-[var(--color-ink)] mb-3">
          {detailsHeading}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {specs.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2.5 py-2.5 px-3 bg-[var(--color-cream-100)]"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <i className={`${s.icon} text-sm text-[var(--color-gold)]`} />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 tracking-wide uppercase">
                  {s.label}
                </p>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]">
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] tracking-wider uppercase px-2.5 py-1 border border-[var(--color-border)] text-[var(--color-ink-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {product.description && (
        <div className="bg-[var(--color-cream-100)] border border-[var(--color-border-soft)] p-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--color-ink)] mb-2">
            {descriptionHeading}
          </p>
          <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      )}
    </div>
  )
}
