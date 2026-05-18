'use client'

import type { CartVoucher } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils/format'

interface CartVoucherFormProps {
  voucherCode: string
  setVoucherCode: (code: string) => void
  onSubmit: (event: React.FormEvent) => void
  applying: boolean
  error?: string
  vouchers: CartVoucher[]
  onRemoveVoucher: (code: string) => void
  inputId?: string
}

export default function CartVoucherForm({
  voucherCode,
  setVoucherCode,
  onSubmit,
  applying,
  error,
  vouchers,
  onRemoveVoucher,
  inputId = 'promo-code',
}: CartVoucherFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-5">
      <label
        htmlFor={inputId}
        className="block text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2.5"
      >
        Promo Code
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          placeholder="FRAGSALE"
          value={voucherCode}
          onChange={(e) => {
            setVoucherCode(e.target.value.toUpperCase())
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
                  âˆ’{formatPrice(v.discount)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveVoucher(v.code)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                  aria-label={`Remove ${v.code}`}
                >
                  <i className="ri-close-line" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </form>
  )
}
