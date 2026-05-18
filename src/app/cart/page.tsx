'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils/format'
import { CartPageSkeleton } from '@/components/ui/Skeleton'

const FREE_SHIPPING_THRESHOLD = 75

export default function CartPage() {
  const {
    items,
    subtotal,
    total,
    totalItems,
    discount,
    vouchers,
    loading,
    isSyncing,
    updateQty,
    removeItem,
    applyVoucher,
    removeVoucher,
  } = useCart()

  const [voucherCode, setVoucherCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  async function handleApplyVoucher(e: React.FormEvent) {
    e.preventDefault()
    const code = voucherCode.trim()
    if (!code) return
    setApplying(true)
    setError('')
    const r = await applyVoucher(code)
    setApplying(false)
    if (!r.ok) setError(r.error ?? 'Invalid voucher')
    else setVoucherCode('')
  }

  if (loading) {
    return <CartPageSkeleton />
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen pt-32 pb-20 bg-white">
        <div className="max-w-lg mx-auto px-6 text-center py-20">
          <div className="w-20 h-20 flex items-center justify-center border border-[var(--color-border)] rounded-full mx-auto mb-6">
            <i className="ri-shopping-bag-line text-4xl text-[var(--color-gold)]" />
          </div>
          <h1 className="font-serif text-3xl font-light text-[var(--color-ink)] mb-3">
            Your Cart is Empty
          </h1>
          <p className="text-sm text-gray-400 tracking-wide mb-8">
            Add some fragrances to get started.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[11px] tracking-[0.3em] uppercase font-bold px-10 py-4 transition-all duration-300 whitespace-nowrap"
          >
            <i className="ri-store-2-line" />
            Browse the Shop
          </Link>
        </div>
      </main>
    )
  }

  const freeShipDelta = FREE_SHIPPING_THRESHOLD - subtotal

  return (
    <main className="min-h-screen pt-32 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
            <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
              Your Bag
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)]">
            Shopping Cart
          </h1>
          <p className="text-sm text-gray-500 font-light mt-2">
            {totalItems} item{totalItems === 1 ? '' : 's'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-1">
            {items.map((item) => (
              <div
                key={item.variantSku}
                className="flex gap-5 border-b border-[var(--color-border-soft)] py-6 last:border-0 group"
              >
                <div className="relative w-24 h-28 flex-shrink-0 bg-[var(--color-cream-500)] overflow-hidden">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="96px"
                      className="object-cover object-top"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {item.brand && (
                    <p className="text-[10px] text-[var(--color-gold)] tracking-[0.3em] uppercase font-bold">
                      {item.brand}
                    </p>
                  )}
                  <Link
                    href={item.slug ? `/product/${item.slug}` : '#'}
                    className="block text-sm font-semibold text-[var(--color-ink)] mt-0.5 hover:text-[var(--color-gold)] transition-colors line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {item.variantLabel}
                  </p>

                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center border border-[var(--color-border)]">
                      <button
                        onClick={() =>
                          updateQty(item.variantSku, item.quantity - 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <i className="ri-subtract-line text-sm" />
                      </button>
                      <span className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-[var(--color-ink)] border-x border-[var(--color-border)]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQty(item.variantSku, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
                        aria-label="Increase quantity"
                      >
                        <i className="ri-add-line text-sm" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.variantSku)}
                      className="text-[10px] tracking-[0.2em] uppercase font-semibold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1.5"
                    >
                      <i className="ri-delete-bin-line" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-[var(--color-ink)]">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatPrice(item.price)} ea
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-cream-50)] border border-[var(--color-border)] p-6 lg:sticky lg:top-32">
              <h2 className="font-serif text-lg font-light text-[var(--color-ink)] tracking-wider mb-5 pb-5 border-b border-[var(--color-border-soft)]">
                Order Summary
              </h2>

              {/* Free shipping progress */}
              {freeShipDelta > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                    <span className="tracking-wide">Free Shipping</span>
                    <span className="font-semibold text-[var(--color-gold)]">
                      {formatPrice(freeShipDelta)} away
                    </span>
                  </div>
                  <div className="h-1 bg-[var(--color-border-soft)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Voucher */}
              <form onSubmit={handleApplyVoucher} className="mb-5">
                <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2.5">
                  Promo Code
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="FRAGSALE"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase())
                      setError('')
                    }}
                    className="flex-1 px-3 py-2.5 border border-[var(--color-border)] text-xs text-[var(--color-ink)] placeholder:text-gray-300 outline-none transition-all focus:border-[var(--color-gold)] bg-white tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={applying || !voucherCode.trim()}
                    className="border border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white text-[var(--color-ink)] disabled:opacity-40 text-[10px] tracking-[0.2em] uppercase font-bold px-4 py-2.5 transition-all whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>
                {error && (
                  <p className="text-[10px] text-red-400 mt-1.5 tracking-wide">
                    {error}
                  </p>
                )}
                {vouchers.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {vouchers.map((v) => (
                      <div
                        key={v.code}
                        className="flex justify-between items-center bg-[var(--color-cream-300)] border border-[var(--color-gold-soft)] px-3 py-2 text-xs"
                      >
                        <span className="font-mono font-bold text-[var(--color-gold)] tracking-wider">
                          {v.code}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-semibold">
                            −{formatPrice(v.discount)}
                          </span>
                          <button
                            onClick={() => removeVoucher(v.code)}
                            className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                            aria-label={`Remove ${v.code}`}
                          >
                            <i className="ri-close-line" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </form>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 tracking-wide">
                    Subtotal
                  </span>
                  <span className="text-sm font-semibold text-[var(--color-ink)]">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-600 tracking-wide">
                      Discount
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">
                      −{formatPrice(discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 tracking-wide">
                    Shipping
                  </span>
                  <span className="text-xs text-gray-400 tracking-wide">
                    Calculated at checkout
                  </span>
                </div>
                <div className="h-[1px] bg-[var(--color-border)] my-1" />
                <div className="flex justify-between items-baseline">
                  <span className="text-xs tracking-[0.3em] uppercase font-bold text-[var(--color-ink)]">
                    Order Total
                  </span>
                  <span className="font-serif text-2xl font-light text-[var(--color-ink)]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                aria-disabled={isSyncing}
                onClick={(e) => {
                  if (isSyncing) e.preventDefault()
                }}
                className={`w-full block text-center bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[11px] tracking-[0.3em] uppercase font-bold py-4 transition-all duration-300 ${
                  isSyncing ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {isSyncing ? (
                    <>
                      <i className="ri-loader-4-line animate-spin" />
                      Syncing cart…
                    </>
                  ) : (
                    <>
                      <i className="ri-lock-line" />
                      Secure Checkout
                    </>
                  )}
                </span>
              </Link>

              <Link
                href="/shop"
                className="mt-3 w-full block text-center border border-[var(--color-ink)] text-[var(--color-ink)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] text-[10px] tracking-[0.2em] uppercase font-semibold py-3 transition-all duration-300"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
