'use client'

import Link from 'next/link'
import type { CartVoucher } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils/format'
import CartVoucherForm from './CartVoucherForm'
import FreeShippingProgress from './FreeShippingProgress'

interface CartOrderSummaryProps {
  subtotal: number
  total: number
  discount: number
  vouchers: CartVoucher[]
  voucherCode: string
  setVoucherCode: (code: string) => void
  applying: boolean
  error: string
  isSyncing: boolean
  freeShippingThreshold: number
  onApplyVoucher: (event: React.FormEvent) => void
  onRemoveVoucher: (code: string) => void
}

export default function CartOrderSummary({
  subtotal,
  total,
  discount,
  vouchers,
  voucherCode,
  setVoucherCode,
  applying,
  error,
  isSyncing,
  freeShippingThreshold,
  onApplyVoucher,
  onRemoveVoucher,
}: CartOrderSummaryProps) {
  return (
    <aside className="lg:col-span-1">
      <div className="bg-[var(--color-cream-50)] border border-[var(--color-border)] p-6 lg:sticky lg:top-32">
        <h2 className="font-serif text-lg font-light text-[var(--color-ink)] tracking-wider mb-5 pb-5 border-b border-[var(--color-border-soft)]">
          Order Summary
        </h2>

        <FreeShippingProgress
          total={subtotal}
          threshold={freeShippingThreshold}
          label="Free Shipping"
          className="mb-5"
        />

        <CartVoucherForm
          voucherCode={voucherCode}
          setVoucherCode={setVoucherCode}
          onSubmit={onApplyVoucher}
          applying={applying}
          error={error}
          vouchers={vouchers}
          onRemoveVoucher={onRemoveVoucher}
          inputId="cart-promo-code"
        />

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
                âˆ’{formatPrice(discount)}
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
                <i className="ri-loader-4-line animate-spin" aria-hidden="true" />
                Syncing cartâ€¦
              </>
            ) : (
              <>
                <i className="ri-lock-line" aria-hidden="true" />
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
    </aside>
  )
}
