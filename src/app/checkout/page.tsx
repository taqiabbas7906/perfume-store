'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { smartFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { ALL_COUNTRIES, US_STATES } from '@/lib/worldRates'
import { CheckoutSkeleton, Skeleton } from '@/components/ui/Skeleton'

/* ─── Types ─── */
interface CartItem {
  productId: string
  variantSku: string
  quantity: number
  price: number
  name?: string
  variantLabel?: string
  image?: string
  brand?: string
}
interface CartVoucher {
  code: string
  voucherId: string
  discount: number
}
interface CartSummary {
  items: CartItem[]
  subtotal: number
  total: number
  itemCount: number
  discount: number
  vouchers: CartVoucher[]
}
interface ShippingOption {
  id: string
  label: string
  price: number
  estimatedDays: string
  carrier: string
}
interface TaxInfo {
  rate: number
  label: string
  amount: number
  note?: string
}
interface RatesResult {
  countryName: string
  region: string
  tax: TaxInfo
  shipping: ShippingOption[]
  freeShippingThreshold: number | null
  rateSource: string
}

/* ─── Dial codes ─── */
const DIAL_CODES = [
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+7', flag: '🇷🇺', name: 'Russia' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey' },
]

const fmt = (n: number) => `$${n.toFixed(2)}`

const inputBase =
  'w-full px-4 py-3.5 border text-sm text-[var(--color-ink)] placeholder:text-gray-300 outline-none transition-all duration-200 focus:border-[var(--color-gold)] bg-white'
const inputDefault = `${inputBase} border-[var(--color-border)]`
const labelCls =
  'block text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2'
const btnDark =
  'bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[11px] tracking-[0.3em] uppercase font-bold py-4 transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-3 disabled:opacity-60'
const btnGold =
  'bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white text-[11px] tracking-[0.3em] uppercase font-bold py-4 transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-3 disabled:opacity-60'
const btnGhost =
  'border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] text-[11px] tracking-[0.2em] uppercase font-bold px-6 py-4 transition-all duration-300 whitespace-nowrap flex items-center gap-2'

/* ─── Luxury step indicator ─── */
function Steps({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Delivery', icon: 'ri-mail-line' },
    { n: 2, label: 'Shipping', icon: 'ri-truck-line' },
    { n: 3, label: 'Payment', icon: 'ri-bank-card-line' },
  ]
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((s, i) => {
        const done = step > s.n
        const active = step === s.n
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  done
                    ? 'bg-[var(--color-gold)] border-[var(--color-gold)] text-white'
                    : active
                      ? 'border-[var(--color-gold)] text-[var(--color-gold)] bg-white'
                      : 'border-[var(--color-border)] text-[var(--color-gold-soft)] bg-white'
                }`}
              >
                {done ? (
                  <i className="ri-check-line text-sm font-bold" />
                ) : (
                  <i className={`${s.icon} text-sm`} />
                )}
              </div>
              <span
                className={`text-[10px] tracking-widest uppercase mt-1.5 font-semibold ${
                  active
                    ? 'text-[var(--color-gold)]'
                    : done
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-gold-soft)]'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-[1px] mx-3 transition-all duration-500 ${
                  done ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-border)]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Field wrapper ─── */
function Field({
  label,
  req,
  children,
  error,
  htmlFor,
}: {
  label: string
  req?: boolean
  children: React.ReactNode
  error?: string
  htmlFor?: string
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
        {req && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-400 mt-1.5">{error}</p>}
    </div>
  )
}

/* ─── Order Summary sidebar ─── */
function Summary({
  cart,
  selectedShipping,
  tax,
  region,
  rateSource,
  voucherCode,
  setVoucherCode,
  applyVoucher,
  removeVoucher,
  applyingVoucher,
  ratesLoading,
  freeThreshold,
  hasFreeShippingVoucher,
}: {
  cart: CartSummary
  selectedShipping: ShippingOption | null
  tax: TaxInfo | null
  region: string | null
  rateSource: string | null
  voucherCode: string
  setVoucherCode: (v: string) => void
  applyVoucher: (e: React.FormEvent) => void
  removeVoucher: (code: string) => void
  applyingVoucher: boolean
  ratesLoading: boolean
  freeThreshold: number | null
  hasFreeShippingVoucher: boolean
}) {
  const shippingCost = hasFreeShippingVoucher ? 0 : (selectedShipping?.price ?? 0)
  const taxAmount = tax?.amount ?? 0
  const grandTotal = cart.total + shippingCost + taxAmount
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="w-full lg:w-[400px] flex-shrink-0">
      <div className="bg-[var(--color-cream-50)] border border-[var(--color-border)] p-6 lg:sticky lg:top-32">
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[var(--color-border-soft)]">
          <i className="ri-shopping-bag-line text-[var(--color-gold)]" />
          <h3 className="font-serif text-lg font-light text-[var(--color-ink)] tracking-wider">
            Order Summary
          </h3>
          <span className="ml-auto text-[10px] tracking-widest text-gray-400 font-semibold">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-4 max-h-64 overflow-y-auto mb-6 pr-1">
          {cart.items.map((item) => (
            <div key={item.variantSku} className="flex gap-3">
              <div className="relative flex-shrink-0">
                <div className="relative w-16 h-20 bg-white border border-[var(--color-border-soft)] overflow-hidden">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name ?? ''}
                      fill
                      sizes="64px"
                      className="object-cover object-top"
                    />
                  )}
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-gold)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {item.brand && (
                  <p className="text-[9px] text-[var(--color-gold)] tracking-[0.3em] uppercase font-bold">
                    {item.brand}
                  </p>
                )}
                <p className="text-xs font-semibold text-[var(--color-ink)] mt-0.5 leading-snug line-clamp-2">
                  {item.name}
                </p>
                {item.variantLabel && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {item.variantLabel}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-[var(--color-ink)]">
                  {fmt(item.price * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-[10px] text-gray-400">{fmt(item.price)} ea</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-5 pb-5 border-b border-[var(--color-border-soft)]">
          <label
            htmlFor="checkout-promo-code"
            className="block text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2.5"
          >
            Promo Code
          </label>
          <form onSubmit={applyVoucher} className="flex gap-2">
            <input
              id="checkout-promo-code"
              type="text"
              placeholder="FRAGSALE"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2.5 border border-[var(--color-border)] text-xs text-[var(--color-ink)] placeholder:text-gray-300 outline-none transition-all focus:border-[var(--color-gold)] bg-white tracking-wider"
            />
            <button
              type="submit"
              disabled={applyingVoucher || !voucherCode.trim()}
              className="border border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white text-[var(--color-ink)] disabled:opacity-40 text-[10px] tracking-[0.2em] uppercase font-bold px-4 py-2.5 transition-all whitespace-nowrap"
            >
              Apply
            </button>
          </form>
          {cart.vouchers.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {cart.vouchers.map((v) => (
                <div
                  key={v.code}
                  className="flex justify-between items-center bg-[var(--color-cream-300)] border border-[var(--color-gold-soft)] px-3 py-2 text-xs"
                >
                  <span className="font-mono font-bold text-[var(--color-gold)] tracking-wider">
                    {v.code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-semibold">
                      −{fmt(v.discount)}
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
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 tracking-wide">Subtotal</span>
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              {fmt(cart.subtotal)}
            </span>
          </div>
          {cart.discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-emerald-600 tracking-wide">
                Discount
              </span>
              <span className="text-sm font-semibold text-emerald-600">
                −{fmt(cart.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 tracking-wide">Shipping</span>
            {ratesLoading ? (
              <span className="text-xs text-gray-300 animate-pulse">
                Calculating…
              </span>
            ) : selectedShipping ? (
              <span
                className={`text-sm font-semibold ${
                  shippingCost === 0 ? 'text-emerald-600' : 'text-[var(--color-ink)]'
                }`}
              >
                {shippingCost === 0 ? 'FREE' : fmt(shippingCost)}
              </span>
            ) : (
              <span className="text-xs text-gray-400 tracking-wide">
                Calculated at delivery
              </span>
            )}
          </div>
          {hasFreeShippingVoucher && (
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1.5">
              <i className="ri-checkbox-circle-line" />
              Free shipping voucher applied
            </p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 tracking-wide">
              {tax ? tax.label : 'Tax'}
              {region ? ` · ${region}` : ''}
            </span>
            {ratesLoading ? (
              <span className="text-xs text-gray-300 animate-pulse">
                Calculating…
              </span>
            ) : tax ? (
              <span className="text-sm font-semibold text-[var(--color-ink)]">
                {taxAmount > 0 ? (
                  fmt(taxAmount)
                ) : (
                  <span className="text-emerald-600">None</span>
                )}
              </span>
            ) : (
              <span className="text-xs text-gray-400 tracking-wide">
                Calculated at delivery
              </span>
            )}
          </div>
          <div className="h-[1px] bg-[var(--color-border)] my-1" />
          <div className="flex justify-between items-baseline">
            <span className="text-xs tracking-[0.3em] uppercase font-bold text-[var(--color-ink)]">
              Order Total
            </span>
            <span className="font-serif text-2xl font-light text-[var(--color-ink)]">
              {fmt(grandTotal)}
            </span>
          </div>
        </div>

        {!ratesLoading &&
          !hasFreeShippingVoucher &&
          freeThreshold !== null &&
          cart.subtotal < freeThreshold && (
            <div className="bg-[var(--color-cream-300)] border border-[var(--color-gold-soft)] px-3 py-2 text-[10px] text-[var(--color-gold-deep)] mb-5 tracking-wide">
              Add <strong>{fmt(freeThreshold - cart.subtotal)}</strong> more for
              free shipping
            </div>
          )}

        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[var(--color-border-soft)]">
          {[
            { icon: 'ri-verified-badge-line', label: '100% Authentic' },
            { icon: 'ri-truck-line', label: 'Fast Delivery' },
            { icon: 'ri-arrow-go-back-line', label: 'Easy Returns' },
          ].map((b) => (
            <div
              key={b.label}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <i className={`${b.icon} text-[var(--color-gold)] text-base`} />
              <span className="text-[9px] text-gray-400 tracking-wide leading-tight">
                {b.label}
              </span>
            </div>
          ))}
        </div>

        {!ratesLoading && rateSource && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-gray-400 tracking-wide">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                rateSource === 'live' ? 'bg-emerald-400' : 'bg-gray-300'
              }`}
            />
            {rateSource === 'live' ? 'Live tax rates' : 'Curated rates'}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Success state ─── */
function SuccessScreen({
  orderId,
  guestEmail,
  isGuest,
}: {
  orderId: string | null
  guestEmail: string
  isGuest: boolean
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const steps = [
    {
      icon: 'ri-mail-send-line',
      label: 'Confirmation Email Sent',
      sub: 'Check your inbox for order details',
    },
    {
      icon: 'ri-box-3-line',
      label: 'Order Processing',
      sub: "We're preparing your fragrance",
    },
    {
      icon: 'ri-truck-line',
      label: 'Shipping Soon',
      sub: 'Estimated 5–7 business days',
    },
    {
      icon: 'ri-gift-line',
      label: 'Enjoy Your Scent',
      sub: 'Authentic, direct from the house',
    },
  ]

  const display = orderId
    ? `INS-${orderId.slice(-8).toUpperCase()}`
    : '—'

  return (
    <div
      className={`min-h-[70vh] flex flex-col items-center justify-center text-center py-20 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="relative mb-8">
        <div
          className={`w-24 h-24 rounded-full border-2 border-[var(--color-gold)] flex items-center justify-center transition-all duration-700 delay-200 ${
            visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-[var(--color-gold)] flex items-center justify-center">
            <i className="ri-check-line text-white text-3xl font-bold" />
          </div>
        </div>
        <div className="absolute inset-0 rounded-full border border-[var(--color-border)] scale-125" />
        <div className="absolute inset-0 rounded-full border border-[var(--color-border-soft)] scale-150" />
      </div>

      <div
        className={`transition-all duration-700 delay-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <p className="text-[10px] tracking-[0.4em] uppercase text-[var(--color-gold)] font-bold mb-3">
          Order Confirmed
        </p>
        <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)] mb-4">
          Thank You!
        </h1>
        <p className="text-sm text-gray-500 tracking-wide max-w-md mx-auto leading-relaxed">
          Your order has been placed successfully.
          {isGuest && (
            <>
              {' '}
              A confirmation will be sent to{' '}
              <strong className="text-[var(--color-ink)]">{guestEmail}</strong>.
            </>
          )}
        </p>
      </div>

      <div
        className={`mt-8 border border-[var(--color-border)] bg-[var(--color-cream-50)] px-8 py-5 transition-all duration-700 delay-400 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <p className="text-[9px] tracking-[0.4em] uppercase text-gray-400 font-semibold mb-1">
          Order Number
        </p>
        <p className="font-serif text-2xl font-light text-[var(--color-gold)] tracking-wider">
          {display}
        </p>
      </div>

      <div
        className={`mt-12 w-full max-w-2xl transition-all duration-700 delay-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <p className="text-[10px] tracking-[0.4em] uppercase text-[var(--color-ink)] font-bold mb-6">
          What Happens Next
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="w-12 h-12 flex items-center justify-center border border-[var(--color-border)] bg-white">
                <i className={`${s.icon} text-[var(--color-gold)] text-xl`} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--color-ink)] tracking-wide">
                  {s.label}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5 leading-snug">
                  {s.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`flex flex-col sm:flex-row gap-4 mt-12 transition-all duration-700 delay-600 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {!isGuest && orderId && (
          <Link
            href={`/orders/${orderId}`}
            className="border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white text-[11px] tracking-[0.25em] uppercase font-bold px-10 py-4 transition-all duration-300 whitespace-nowrap flex items-center gap-3"
          >
            <i className="ri-file-list-3-line" />
            View Order
          </Link>
        )}
        <Link
          href="/shop"
          className="bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white text-[11px] tracking-[0.25em] uppercase font-bold px-10 py-4 transition-all duration-300 whitespace-nowrap flex items-center gap-3"
        >
          <i className="ri-shopping-bag-line" />
          Continue Shopping
        </Link>
      </div>

      <p className="mt-10 text-[10px] text-gray-400 tracking-wide">
        Questions? Email us at{' '}
        <a
          href="mailto:support@inscentives.com"
          className="text-[var(--color-gold)] hover:underline"
        >
          support@inscentives.com
        </a>
      </p>
    </div>
  )
}

/* ─── Main Page ─── */
export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { flush: flushCart, isSyncing: cartSyncing } = useCart()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stable idempotency keys so accidental double-submits don't create two orders.
  const orderIdempotencyRef = useRef<string | null>(null)
  const paymentIdempotencyRef = useRef<string | null>(null)
  const submittingRef = useRef(false)

  const [cart, setCart] = useState<CartSummary | null>(null)
  const [cartEmpty, setCartEmpty] = useState(false)
  const [step, setStep] = useState(1)
  const [pageLoading, setPageLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const [guestEmail, setGuestEmail] = useState('')
  const [addr, setAddr] = useState({
    name: '',
    line1: '',
    city: '',
    country: 'US',
    state: '',
    zip: '',
  })
  const [dialCode, setDialCode] = useState('+1')
  const [phoneLocal, setPhoneLocal] = useState('')

  const [rates, setRates] = useState<RatesResult | null>(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [region, setRegion] = useState<string | null>(null)
  const [rateSource, setRateSource] = useState<string | null>(null)

  const [voucherCode, setVoucherCode] = useState('')
  const [applyingVoucher, setApplyingVoucher] = useState(false)

  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' })

  const fetchCart = useCallback(
    async (params?: { voucherCode?: string; removeVoucher?: string }) => {
      try {
        const sp = new URLSearchParams()
        if (params?.voucherCode) sp.set('voucherCode', params.voucherCode)
        if (params?.removeVoucher) sp.set('removeVoucher', params.removeVoucher)
        const url = sp.toString() ? `/api/cart?${sp}` : '/api/cart'
        const res = await smartFetch(url)
        const data = await res.json()
        if (data.success) {
          if (!data.items || data.items.length === 0) {
            setCartEmpty(true)
          } else {
            setCart(data)
            setCartEmpty(false)
          }
        } else {
          setError(data.error || 'Failed to load cart')
        }
      } catch {
        setError('Failed to load cart')
      } finally {
        setPageLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (authLoading) return
    const timer = window.setTimeout(() => {
      if (user?.email) setGuestEmail(user.email)
      void fetchCart()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [user?.email, authLoading, fetchCart])

  const fetchRates = useCallback(
    async (country: string, state: string, subtotal: number) => {
      if (!country) return
      if (country === 'US' && !state) return
      setRatesLoading(true)
      try {
        const res = await fetch('/api/shipping/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country,
            state: country === 'US' ? state : undefined,
            subtotal,
          }),
        })
        const data = await res.json()
        if (data.success) {
          setRates(data)
          setRegion(data.region)
          setRateSource(data.rateSource)
          setSelectedIdx(0)
        }
      } catch {
        /* silently fallback */
      } finally {
        setRatesLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!cart) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(
      () => fetchRates(addr.country, addr.state, cart.subtotal),
      500,
    )
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [addr.country, addr.state, cart, fetchRates])

  const taxRate = rates?.tax.rate ?? 0
  const taxAmount = cart
    ? Math.round(cart.subtotal * taxRate * 100) / 100
    : 0
  const taxInfo: TaxInfo | null = rates ? { ...rates.tax, amount: taxAmount } : null

  const applyVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherCode.trim()) return
    setApplyingVoucher(true)
    setError('')
    try {
      const r = await smartFetch('/api/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: voucherCode.trim(),
          cartTotal: cart?.subtotal ?? 0,
          productIds: cart?.items.map((i) => i.productId) ?? [],
        }),
      })
      const d = await r.json()
      if (!r.ok || !d.success) {
        setError(d.error || 'Invalid voucher')
        return
      }
      await fetchCart({ voucherCode: voucherCode.trim() })
      setVoucherCode('')
    } catch {
      setError('Failed to apply voucher')
    } finally {
      setApplyingVoucher(false)
    }
  }

  const removeVoucher = async (code: string) => {
    await fetchCart({ removeVoucher: code })
  }

  const fullPhone = dialCode + phoneLocal.replace(/[\s\-().]/g, '')

  const goDelivery = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!user && !guestEmail.trim()) {
      setError('Email is required to continue')
      return
    }
    if (!addr.name || !addr.line1 || !addr.city || !addr.zip) {
      setError('Please fill all address fields')
      return
    }
    if (addr.country === 'US' && !addr.state) {
      setError('Please select your state')
      return
    }
    const strippedLocal = phoneLocal.replace(/[\s\-().]/g, '')
    if (!strippedLocal || !/^\d{5,15}$/.test(strippedLocal)) {
      setError(
        'Please enter a valid local phone number (5–15 digits, e.g. 3001234567)',
      )
      return
    }
    setStep(2)
  }

  const goPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!rates) {
      setError('Please wait for shipping rates to load')
      return
    }
    // Flush any pending optimistic cart mutations so the backend reserves the
    // canonical quantities, not stale ones.
    await flushCart()
    await fetchCart()
    const latest = cart
    if (!latest || latest.items.length === 0) {
      setError('Your cart is empty')
      return
    }
    try {
      const res = await smartFetch('/api/checkout/reserve', {
        method: 'POST',
        body: JSON.stringify({
          items: latest.items.map((i) => ({
            productId: i.productId,
            variantSku: i.variantSku,
            quantity: i.quantity,
          })),
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(
          data.error ??
            'One or more items is no longer available in the requested quantity.',
        )
        return
      }
    } catch {
      /* non-fatal — final stock check happens at order creation */
    }
    setStep(3)
  }

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    // Dedupe double-submits — pressing the button twice or pressing Enter twice
    // cannot create two orders.
    if (submittingRef.current) return
    submittingRef.current = true
    setProcessing(true)
    setError('')
    // Final flush — guarantees any in-flight cart mutation is persisted before
    // we lock in the order. Backend then re-validates prices, stock, taxes.
    await flushCart()
    await fetchCart()
    const sel = rates?.shipping[selectedIdx] ?? null
    const hasFreeShippingVoucher =
      cart?.vouchers?.some((v) => v.code === 'FREESHIP') ?? false
    // Reuse the same idempotency keys for the entire submission so retries on
    // network failure don't create duplicate orders / charges.
    if (!orderIdempotencyRef.current)
      orderIdempotencyRef.current = crypto.randomUUID()
    if (!paymentIdempotencyRef.current)
      paymentIdempotencyRef.current = crypto.randomUUID()
    try {
      const orderRes = await smartFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart!.items.map((i) => ({
            productId: i.productId,
            variantSku: i.variantSku,
            quantity: i.quantity,
          })),
          shippingAddress: {
            name: addr.name,
            address: addr.line1,
            city: addr.city,
            state: addr.state || undefined,
            country: addr.country,
            zip: addr.zip,
            phone: fullPhone,
          },
          idempotencyKey: orderIdempotencyRef.current,
          voucherCodes: cart!.vouchers.map((v) => v.code),
          guestEmail: !user ? guestEmail : undefined,
          shippingAmount: hasFreeShippingVoucher ? 0 : (sel?.price ?? 0),
          taxAmount,
        }),
      })
      const od = await orderRes.json()
      if (!od.success) {
        if (od.errors) {
          const msgs = Object.entries(od.errors as Record<string, string[]>)
            .map(
              ([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`,
            )
            .join(' | ')
          setError(msgs || od.error || 'Order failed')
        } else {
          setError(od.error || 'Order failed')
        }
        // Order rejected — allow retry with fresh keys.
        orderIdempotencyRef.current = null
        paymentIdempotencyRef.current = null
        submittingRef.current = false
        return
      }

      const payRes = await smartFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: od.order._id,
          sourceId: 'cnon:card-nonce-ok',
          idempotencyKey: paymentIdempotencyRef.current,
        }),
      })
      const pd = await payRes.json()
      if (pd.success) {
        setOrderId(od.order._id)
        setSuccess(true)
      } else {
        setError(pd.error || 'Payment failed')
        // Reset the idempotency keys so the user can retry with fresh ones.
        orderIdempotencyRef.current = null
        paymentIdempotencyRef.current = null
        submittingRef.current = false
      }
    } catch {
      setError('Something went wrong')
      orderIdempotencyRef.current = null
      paymentIdempotencyRef.current = null
      submittingRef.current = false
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (cartEmpty && !success) router.replace('/cart')
  }, [cartEmpty, success, router])

  if (authLoading || pageLoading) {
    return <CheckoutSkeleton />
  }

  if (cartEmpty || !cart) {
    if (success) {
      return (
        <main className="pt-28 pb-20 bg-white min-h-screen">
          <div className="max-w-3xl mx-auto px-6">
            <SuccessScreen
              orderId={orderId}
              guestEmail={guestEmail}
              isGuest={!user}
            />
          </div>
        </main>
      )
    }
    return null
  }

  const selectedShipping = rates?.shipping[selectedIdx] ?? null
  const hasFreeShippingVoucher =
    cart.vouchers?.some((v) => v.code === 'FREESHIP') ?? false
  const shippingCost = hasFreeShippingVoucher
    ? 0
    : (selectedShipping?.price ?? 0)
  const grandTotal = cart.total + shippingCost + taxAmount

  if (success) {
    return (
      <main className="pt-28 pb-20 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-6">
          <SuccessScreen
            orderId={orderId}
            guestEmail={guestEmail}
            isGuest={!user}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="pt-28 pb-20 bg-white min-h-screen">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/shop"
            className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gray-400 hover:text-[var(--color-gold)] transition-colors"
          >
            <i className="ri-arrow-left-line text-sm" />
            Back to Shop
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[var(--color-gold)] font-bold mb-2">
              Inscentives Perfume
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)]">
              Checkout
            </h1>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            {[
              { icon: 'ri-lock-line', label: 'Secure Checkout' },
              { icon: 'ri-shield-check-line', label: 'SSL Encrypted' },
              { icon: 'ri-verified-badge-line', label: '100% Authentic' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1.5">
                <i className={`${b.icon} text-[var(--color-gold)] text-sm`} />
                <span className="text-[10px] text-gray-400 tracking-wide whitespace-nowrap">
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[1px] w-full bg-gradient-to-r from-[var(--color-border)] via-[var(--color-gold)] to-[var(--color-border)] mt-8" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 xl:gap-20">
          <div className="flex-1 min-w-0">
            <Steps step={step} />

            {/* ── STEP 1: DELIVERY ── */}
            {step === 1 && (
              <form onSubmit={goDelivery} className="animate-fadeIn space-y-6">
                <div>
                  <h2 className="font-serif text-2xl font-light text-[var(--color-ink)] mb-1">
                    Contact Information
                  </h2>
                  <p className="text-xs text-gray-400 tracking-wide mb-6">
                    We&apos;ll use this to send your order confirmation
                  </p>

                  {user ? (
                    <div className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-cream-50)] px-4 py-3">
                      <i className="ri-user-line text-[var(--color-gold)] text-sm" />
                      <p className="text-xs text-gray-500 tracking-wide">
                        Signed in as{' '}
                        <span className="font-semibold text-[var(--color-ink)]">
                          {user.email}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <Field label="Email Address" req htmlFor="checkout-email">
                      <div className="relative">
                        <i className="ri-mail-line text-[var(--color-gold)] text-sm absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          id="checkout-email"
                          type="email"
                          required
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="your@email.com"
                          className={`${inputDefault} pl-11`}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 tracking-wide">
                        Checking out as guest.{' '}
                        <Link
                          href="/login"
                          onClick={() =>
                            sessionStorage.setItem(
                              'checkoutRedirect',
                              '/checkout',
                            )
                          }
                          className="text-[var(--color-gold)] hover:underline"
                        >
                          Sign in
                        </Link>{' '}
                        to track your orders.
                      </p>
                    </Field>
                  )}
                </div>

                <div>
                  <h2 className="font-serif text-2xl font-light text-[var(--color-ink)] mb-1">
                    Shipping Address
                  </h2>
                  <p className="text-xs text-gray-400 tracking-wide mb-6">
                    Where should we send your order?
                  </p>

                  <div className="space-y-5">
                    <Field label="Full Name" req htmlFor="shipping-name">
                      <input
                        id="shipping-name"
                        type="text"
                        required
                        value={addr.name}
                        onChange={(e) =>
                          setAddr({ ...addr, name: e.target.value })
                        }
                        placeholder="Jane Smith"
                        className={inputDefault}
                      />
                    </Field>

                    <Field label="Phone Number" req htmlFor="shipping-phone">
                      <div className="flex gap-2">
                        <select
                          id="shipping-dial-code"
                          aria-label="Country code"
                          value={dialCode}
                          onChange={(e) => setDialCode(e.target.value)}
                          className={`w-44 ${inputDefault} cursor-pointer appearance-none`}
                        >
                          {DIAL_CODES.map((d, i) => (
                            <option key={`${d.code}-${i}`} value={d.code}>
                              {d.flag} {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                        <input
                          id="shipping-phone"
                          type="tel"
                          required
                          inputMode="numeric"
                          value={phoneLocal}
                          onChange={(e) =>
                            setPhoneLocal(
                              e.target.value.replace(/[^\d\s\-().]/g, ''),
                            )
                          }
                          maxLength={15}
                          placeholder="300 1234567"
                          className={`flex-1 ${inputDefault}`}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 tracking-wide">
                        Select your country code, then enter your local number.
                      </p>
                    </Field>

                    <Field label="Country" req htmlFor="shipping-country">
                      <select
                        id="shipping-country"
                        required
                        value={addr.country}
                        onChange={(e) =>
                          setAddr({
                            ...addr,
                            country: e.target.value,
                            state: '',
                          })
                        }
                        className={`${inputDefault} cursor-pointer appearance-none`}
                      >
                        {ALL_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {addr.country === 'US' && (
                      <Field label="State" req htmlFor="shipping-state">
                        <select
                          id="shipping-state"
                          required
                          value={addr.state}
                          onChange={(e) =>
                            setAddr({ ...addr, state: e.target.value })
                          }
                          className={`${inputDefault} cursor-pointer appearance-none`}
                        >
                          <option value="">Select state…</option>
                          {US_STATES.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}

                    <Field label="Street Address" req htmlFor="shipping-line1">
                      <input
                        id="shipping-line1"
                        type="text"
                        required
                        value={addr.line1}
                        onChange={(e) =>
                          setAddr({ ...addr, line1: e.target.value })
                        }
                        placeholder="123 Main St, Apt 4B"
                        className={inputDefault}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="City" req htmlFor="shipping-city">
                        <input
                          id="shipping-city"
                          type="text"
                          required
                          value={addr.city}
                          onChange={(e) =>
                            setAddr({ ...addr, city: e.target.value })
                          }
                          placeholder="New York"
                          className={inputDefault}
                        />
                      </Field>
                      <Field label="ZIP / Postal" req htmlFor="shipping-zip">
                        <input
                          id="shipping-zip"
                          type="text"
                          required
                          value={addr.zip}
                          onChange={(e) =>
                            setAddr({ ...addr, zip: e.target.value })
                          }
                          placeholder="10001"
                          className={inputDefault}
                        />
                      </Field>
                    </div>

                    <div className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-cream-50)] px-4 py-3 mt-2">
                      <i className="ri-lock-line text-[var(--color-gold)] text-sm" />
                      <p className="text-[10px] text-gray-400 tracking-wide">
                        Your information is encrypted and secure. We never share
                        your data.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-50 border border-red-100 px-4 py-3 tracking-wide">
                    {error}
                  </p>
                )}

                <button type="submit" className={`w-full ${btnDark}`}>
                  Continue to Shipping
                  <i className="ri-arrow-right-line" />
                </button>
              </form>
            )}

            {/* ── STEP 2: SHIPPING ── */}
            {step === 2 && (
              <form onSubmit={goPayment} className="animate-fadeIn space-y-6">
                <div className="border border-[var(--color-border)] bg-[var(--color-cream-50)] p-5 flex justify-between gap-4">
                  <div className="text-sm">
                    <p className="font-semibold text-[var(--color-ink)]">
                      {addr.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {addr.line1}, {addr.city}
                    </p>
                    <p className="text-xs text-gray-500">
                      {addr.state ? `${addr.state}, ` : ''}
                      {addr.country} {addr.zip}
                    </p>
                    <p className="text-xs text-gray-500">{fullPhone}</p>
                    {!user && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {guestEmail}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] text-[var(--color-gold)] hover:text-[var(--color-ink)] tracking-[0.2em] uppercase font-semibold transition-colors self-start"
                  >
                    Edit
                  </button>
                </div>

                <div>
                  <h2 className="font-serif text-2xl font-light text-[var(--color-ink)] mb-1">
                    Shipping Method
                  </h2>
                  <p className="text-xs text-gray-400 tracking-wide mb-6">
                    Choose how quickly you&apos;d like to receive your order
                  </p>

                  {ratesLoading && (
                    <div className="space-y-3 py-2" aria-live="polite">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  )}

                  {!ratesLoading && (rates?.shipping?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      {rates!.shipping.map((opt, i) => {
                        const isSelected = selectedIdx === i
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between border p-4 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'border-[var(--color-gold)] bg-[var(--color-cream-200)]'
                                : 'border-[var(--color-border)] hover:border-[var(--color-gold-soft)] bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  isSelected
                                    ? 'border-[var(--color-gold)]'
                                    : 'border-[var(--color-gold-soft)]'
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-[var(--color-gold)]" />
                                )}
                              </div>
                              <input
                                type="radio"
                                name="ship"
                                className="sr-only"
                                checked={isSelected}
                                onChange={() => setSelectedIdx(i)}
                              />
                              <div>
                                <p className="text-xs font-semibold text-[var(--color-ink)]">
                                  {opt.label}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {opt.carrier} · {opt.estimatedDays}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-bold ${
                                opt.price === 0
                                  ? 'text-emerald-600'
                                  : 'text-[var(--color-ink)]'
                              }`}
                            >
                              {opt.price === 0 ? 'FREE' : fmt(opt.price)}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {!ratesLoading && !rates && (
                    <p className="text-sm text-gray-400">
                      Select country
                      {addr.country === 'US' ? ' & state' : ''} on the previous
                      step to see rates.
                    </p>
                  )}
                </div>

                {!ratesLoading && taxInfo && taxInfo.rate > 0 && (
                  <div className="border border-[var(--color-gold-soft)] bg-[var(--color-cream-300)] p-4">
                    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-gold-deep)] mb-2">
                      {taxInfo.label} — {rates?.countryName}
                      {region && region !== rates?.countryName ? `, ${region}` : ''}
                    </p>
                    <div className="flex justify-between text-xs text-[var(--color-ink-soft)]">
                      <span>Rate</span>
                      <span className="font-semibold">
                        {(taxInfo.rate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-ink-soft)] mt-1 font-medium">
                      <span>
                        {taxInfo.label} on {fmt(cart.subtotal)}
                      </span>
                      <span>{taxAmount > 0 ? fmt(taxAmount) : 'None'}</span>
                    </div>
                    {taxInfo.note && (
                      <p className="text-[10px] text-gray-500 mt-2 tracking-wide">
                        {taxInfo.note}
                      </p>
                    )}
                  </div>
                )}

                {!ratesLoading && taxInfo && taxInfo.rate === 0 && (
                  <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
                    <i className="ri-checkbox-circle-line" />
                    No {taxInfo.label} applies for {rates?.countryName}
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400 bg-red-50 border border-red-100 px-4 py-3 tracking-wide">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={btnGhost}
                  >
                    <i className="ri-arrow-left-line" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={ratesLoading || !rates || cartSyncing}
                    className={`flex-1 ${btnDark}`}
                  >
                    {cartSyncing ? (
                      <>
                        <i className="ri-loader-4-line animate-spin" />
                        Syncing cart…
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <i className="ri-arrow-right-line" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: PAYMENT ── */}
            {step === 3 && (
              <form onSubmit={placeOrder} className="animate-fadeIn space-y-6">
                <div className="border border-[var(--color-border)] bg-[var(--color-cream-50)] p-5 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 tracking-wide">
                      Shipping to
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-ink)]">
                      {addr.city}, {addr.country}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 tracking-wide">
                      Shipping
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-ink)]">
                      {selectedShipping
                        ? shippingCost === 0
                          ? 'Free'
                          : fmt(shippingCost)
                        : '—'}
                      {selectedShipping && (
                        <span className="text-gray-400 font-normal ml-1">
                          ({selectedShipping.label})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 tracking-wide">
                      {taxInfo?.label ?? 'Tax'}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-ink)]">
                      {taxAmount > 0 ? fmt(taxAmount) : '$0.00'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[10px] text-[var(--color-gold)] hover:text-[var(--color-ink)] tracking-[0.2em] uppercase font-semibold transition-colors mt-2"
                  >
                    Edit
                  </button>
                </div>

                <div>
                  <h2 className="font-serif text-2xl font-light text-[var(--color-ink)] mb-1">
                    Payment Details
                  </h2>
                  <p className="text-xs text-gray-400 tracking-wide mb-6">
                    Square sandbox · test card 4111 1111 1111 1111
                  </p>

                  <div className="flex items-center gap-2 mb-6">
                    <p className="text-[10px] text-gray-400 tracking-wide mr-2 whitespace-nowrap">
                      We accept:
                    </p>
                    {['VISA', 'MC', 'AMEX', 'DISC'].map((c) => (
                      <span
                        key={c}
                        className="border border-[var(--color-gold-soft)] bg-white text-[8px] text-[var(--color-gold-deep)] font-extrabold tracking-widest px-2 py-1"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-5">
                    <Field label="Name on Card" req htmlFor="card-name">
                      <input
                        id="card-name"
                        type="text"
                        required
                        value={card.name}
                        onChange={(e) =>
                          setCard({ ...card, name: e.target.value })
                        }
                        placeholder="Jane Smith"
                        className={inputDefault}
                      />
                    </Field>

                    <Field label="Card Number" req htmlFor="card-number">
                      <div className="relative">
                        <i className="ri-bank-card-line text-[var(--color-gold)] text-sm absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          id="card-number"
                          type="text"
                          required
                          maxLength={19}
                          value={card.number}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, '')
                            v = v.match(/.{1,4}/g)?.join(' ') || v
                            setCard({ ...card, number: v })
                          }}
                          placeholder="4111 1111 1111 1111"
                          className={`${inputDefault} pl-11 font-mono tracking-wider`}
                        />
                      </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Expiry (MM/YY)" req htmlFor="card-expiry">
                        <input
                          id="card-expiry"
                          type="text"
                          required
                          maxLength={5}
                          value={card.expiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, '')
                            if (v.length >= 2)
                              v = v.slice(0, 2) + '/' + v.slice(2)
                            setCard({ ...card, expiry: v })
                          }}
                          placeholder="12/28"
                          className={`${inputDefault} font-mono tracking-wider`}
                        />
                      </Field>
                      <Field label="CVV" req htmlFor="card-cvv">
                        <input
                          id="card-cvv"
                          type="text"
                          required
                          maxLength={4}
                          value={card.cvv}
                          onChange={(e) =>
                            setCard({
                              ...card,
                              cvv: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          placeholder="123"
                          className={`${inputDefault} font-mono`}
                        />
                      </Field>
                    </div>

                    <div className="flex items-center gap-6 border border-[var(--color-border)] bg-[var(--color-cream-50)] px-5 py-4">
                      {[
                        { icon: 'ri-lock-2-line', label: 'SSL Secured' },
                        { icon: 'ri-shield-check-line', label: 'PCI Compliant' },
                        {
                          icon: 'ri-verified-badge-line',
                          label: 'Fraud Protected',
                        },
                      ].map((b) => (
                        <div
                          key={b.label}
                          className="flex items-center gap-2"
                        >
                          <i
                            className={`${b.icon} text-[var(--color-gold)] text-sm`}
                          />
                          <span className="text-[10px] text-gray-400 tracking-wide">
                            {b.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-50 border border-red-100 px-4 py-3 tracking-wide">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className={btnGhost}
                  >
                    <i className="ri-arrow-left-line" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={processing || cartSyncing}
                    className={`flex-1 ${btnGold}`}
                  >
                    {processing ? (
                      <>
                        <i className="ri-loader-4-line animate-spin" />
                        Processing…
                      </>
                    ) : cartSyncing ? (
                      <>
                        <i className="ri-loader-4-line animate-spin" />
                        Syncing cart…
                      </>
                    ) : (
                      <>
                        <i className="ri-lock-line" />
                        Pay {fmt(grandTotal)}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <Summary
            cart={cart}
            selectedShipping={selectedShipping}
            tax={taxInfo}
            region={region}
            rateSource={rateSource}
            voucherCode={voucherCode}
            setVoucherCode={setVoucherCode}
            applyVoucher={applyVoucher}
            removeVoucher={removeVoucher}
            applyingVoucher={applyingVoucher}
            ratesLoading={ratesLoading}
            freeThreshold={rates?.freeShippingThreshold ?? null}
            hasFreeShippingVoucher={hasFreeShippingVoucher}
          />
        </div>
      </div>
    </main>
  )
}
