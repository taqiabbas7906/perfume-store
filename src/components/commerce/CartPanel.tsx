'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils/format'
import { CartPanelSkeleton } from '@/components/ui/Skeleton'
import CartLineItem from '@/components/cart/CartLineItem'
import FreeShippingProgress from '@/components/cart/FreeShippingProgress'

const FREE_SHIPPING_THRESHOLD = 75

export default function CartPanel() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQty,
    totalPrice,
    totalItems,
    loading,
  } = useCart()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeCart])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-black/30 transition-opacity duration-400 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-[420px] z-[100] bg-white flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border-soft)]">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-lg font-light text-[var(--color-ink)] tracking-wider">
              Your Cart
            </h2>
            {totalItems > 0 && (
              <span className="w-5 h-5 flex items-center justify-center bg-[var(--color-gold)] text-white text-[10px] font-bold rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
            aria-label="Close cart"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading && items.length === 0 ? (
            <CartPanelSkeleton />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-20">
              <div className="w-16 h-16 flex items-center justify-center border border-[var(--color-border)] rounded-full">
                <i className="ri-shopping-bag-line text-3xl text-[var(--color-gold)]" />
              </div>
              <div>
                <p className="text-[var(--color-ink)] font-medium tracking-wide text-sm">
                  Your cart is empty
                </p>
                <p className="text-gray-400 text-xs mt-1.5 tracking-wide">
                  Add your favourite fragrances
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-white text-[10px] tracking-[0.25em] uppercase font-bold px-8 py-3 transition-all duration-300"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <CartLineItem
                key={item.variantSku}
                item={item}
                variant="panel"
                onUpdateQty={updateQty}
                onRemove={removeItem}
              />
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[var(--color-border-soft)] px-6 py-5 bg-[var(--color-cream-50)]">
            <FreeShippingProgress
              total={totalPrice}
              threshold={FREE_SHIPPING_THRESHOLD}
              label="Free Shipping Progress"
              className="mb-4"
              showUnlocked
            />

            <div className="flex justify-between items-baseline mb-4">
              <span className="text-xs text-gray-500 tracking-widest uppercase">
                Subtotal
              </span>
              <span className="font-serif text-xl font-light text-[var(--color-ink)]">
                {formatPrice(totalPrice)}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 text-center mb-4 tracking-wide">
              Shipping &amp; taxes calculated at checkout
            </p>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="w-full block text-center bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[11px] tracking-[0.25em] uppercase font-bold py-4 transition-all duration-300 mb-3"
            >
              <span className="flex items-center justify-center gap-2">
                <i className="ri-lock-line text-sm" />
                Secure Checkout
              </span>
            </Link>
            <button
              type="button"
              onClick={closeCart}
              className="w-full text-center border border-[var(--color-ink)] text-[var(--color-ink)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] text-[10px] tracking-[0.2em] uppercase font-semibold py-3 transition-all duration-300"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
