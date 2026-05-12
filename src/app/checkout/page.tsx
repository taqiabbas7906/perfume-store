'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { smartFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { ALL_COUNTRIES, US_STATES } from '@/lib/worldRates'

/* ─── Types ─── */
interface CartItem { productId:string; variantSku:string; quantity:number; price:number; name?:string; variantLabel?:string; image?:string }
interface CartVoucher { code:string; voucherId:string; discount:number }
interface CartSummary { items:CartItem[]; subtotal:number; total:number; itemCount:number; discount:number; vouchers:CartVoucher[] }
interface ShippingOption { id:string; label:string; price:number; estimatedDays:string; carrier:string }
interface TaxInfo { rate:number; label:string; amount:number; note?:string }
interface RatesResult { countryName:string; region:string; tax:TaxInfo; shipping:ShippingOption[]; freeShippingThreshold:number|null; rateSource:string }

const fmt = (n: number) => `$${n.toFixed(2)}`

const cls = {
  input: 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all placeholder-gray-400',
  select: 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all cursor-pointer',
  btn: 'w-full py-3 rounded-lg text-sm font-semibold transition-all',
  btnPrimary: 'bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40',
  btnOutline: 'border border-gray-200 text-gray-700 hover:bg-gray-50',
}

/* ─── Step indicator ─── */
function Steps({ step }: { step: number }) {
  const labels = ['Delivery', 'Shipping & Tax', 'Payment']
  return (
    <div className="flex items-center mb-10">
      {labels.map((label, i) => {
        const n = i + 1
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > n ? 'bg-emerald-500 text-white' : step === n ? 'bg-gray-900 text-white ring-2 ring-offset-2 ring-gray-400' : 'bg-gray-100 text-gray-400'}`}>
                {step > n ? '✓' : n}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${step === n ? 'text-gray-900' : step > n ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < labels.length - 1 && <div className={`flex-1 h-px mx-2 mt-[-14px] ${step > n ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Field wrapper ─── */
function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{req && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

/* ─── Order Summary sidebar ─── */
function Summary({
  cart, selectedShipping, tax, region, rateSource,
  voucherCode, setVoucherCode, applyVoucher, removeVoucher, applyingVoucher,
  ratesLoading, freeThreshold, hasFreeShippingVoucher,
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

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 sticky top-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Order Summary</h2>

      {/* Items */}
      <div className="space-y-2.5">
        {cart.items.map(item => (
          <div key={item.variantSku} className="flex gap-2.5 items-start">
            {item.image && (
              <div className="w-11 h-11 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-400">{item.variantLabel} · ×{item.quantity}</p>
            </div>
            <p className="text-sm font-medium shrink-0">{fmt(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      {/* Voucher */}
      <form onSubmit={applyVoucher} className="flex gap-2">
        <input
          type="text" placeholder="Promo code"
          value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button type="submit" disabled={applyingVoucher || !voucherCode.trim()} className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">Apply</button>
      </form>
      {cart.vouchers?.map(v => (
        <div key={v.code} className="flex justify-between items-center bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm">
          <span className="font-mono font-medium">{v.code}</span>
          <div className="flex items-center gap-2">
            <span>-{fmt(v.discount)}</span>
            <button onClick={() => removeVoucher(v.code)} className="text-gray-400 hover:text-red-500 text-xs transition-colors">✕</button>
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="border-t border-gray-200 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(cart.subtotal)}</span></div>
        {cart.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmt(cart.discount)}</span></div>}

        {/* Shipping row */}
        <div className="flex justify-between text-gray-500">
          <span>Shipping</span>
          {ratesLoading
            ? <span className="text-gray-300 animate-pulse text-xs">Calculating…</span>
            : selectedShipping
              ? <span className={shippingCost === 0 ? 'text-emerald-600 font-medium' : ''}>{shippingCost === 0 ? 'Free' : fmt(shippingCost)}</span>
              : <span className="text-gray-300">—</span>
          }
        </div>
        {hasFreeShippingVoucher && (
          <div className="text-xs text-emerald-600 font-medium">✓ Free shipping voucher applied</div>
        )}

        {/* Tax row */}
        <div className="flex justify-between text-gray-500">
          <span>{tax ? tax.label : 'Tax'}{region ? ` · ${region}` : ''}</span>
          {ratesLoading
            ? <span className="text-gray-300 animate-pulse text-xs">Calculating…</span>
            : tax
              ? <span>{taxAmount > 0 ? fmt(taxAmount) : <span className="text-emerald-600">None</span>}</span>
              : <span className="text-gray-300">—</span>
          }
        </div>

        <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
          <span>Total</span>
          <span>{fmt(grandTotal)}</span>
        </div>
      </div>

      {/* Free shipping nudge */}
      {!ratesLoading && !hasFreeShippingVoucher && freeThreshold !== null && cart.subtotal < freeThreshold && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
          Add <strong>{fmt(freeThreshold - cart.subtotal)}</strong> more for free shipping!
        </div>
      )}

      {/* Rate source badge */}
      {!ratesLoading && rateSource && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span className={`w-1.5 h-1.5 rounded-full ${rateSource === 'live' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          {rateSource === 'live' ? 'Live tax rates (EU Commission)' : 'Curated tax rates'}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 text-xs text-gray-400 pt-1 border-t border-gray-100">
        <span>🔒 SSL Encrypted</span>
        <span>·</span>
        <span>✓ Secure Checkout</span>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [cart, setCart]               = useState<CartSummary | null>(null)
  const [cartEmpty, setCartEmpty]     = useState(false)   // separate flag to avoid flash
  const [step, setStep]               = useState(1)
  const [pageLoading, setPageLoading] = useState(true)
  const [processing, setProcessing]   = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)
  const [orderId, setOrderId]         = useState<string | null>(null)

  // Delivery
  const [guestEmail, setGuestEmail] = useState('')
  const [addr, setAddr] = useState({ name:'', line1:'', city:'', country:'US', state:'', zip:'' })

  // Rates
  const [rates, setRates]               = useState<RatesResult | null>(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [selectedIdx, setSelectedIdx]   = useState(0)
  const [region, setRegion]             = useState<string | null>(null)
  const [rateSource, setRateSource]     = useState<string | null>(null)

  // Voucher
  const [voucherCode, setVoucherCode]         = useState('')
  const [applyingVoucher, setApplyingVoucher] = useState(false)

  // Payment
  const [card, setCard] = useState({ name:'', number:'', expiry:'', cvv:'' })

  /* ── Cart ── */
  const fetchCart = useCallback(async (params?: { voucherCode?: string; removeVoucher?: string }) => {
    try {
      const sp = new URLSearchParams()
      if (params?.voucherCode)   sp.set('voucherCode',   params.voucherCode)
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
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (user?.email) setGuestEmail(user.email)
    fetchCart()
  }, [user, authLoading, fetchCart])

  // Redirect to cart if empty — in effect, not during render
  useEffect(() => {
    if (cartEmpty) router.replace('/cart')
  }, [cartEmpty, router])

  /* ── Rates fetch ── */
  const fetchRates = useCallback(async (country: string, state: string, subtotal: number) => {
    if (!country) return
    if (country === 'US' && !state) return
    setRatesLoading(true)
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state: country === 'US' ? state : undefined, subtotal }),
      })
      const data = await res.json()
      if (data.success) {
        setRates(data)
        setRegion(data.region)
        setRateSource(data.rateSource)
        setSelectedIdx(0)
      }
    } catch { /* silently fallback */ }
    finally { setRatesLoading(false) }
  }, [])

  // Debounce on address change
  useEffect(() => {
    if (!cart) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchRates(addr.country, addr.state, cart.subtotal), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [addr.country, addr.state, cart?.subtotal, fetchRates])

  // Recalculate tax when subtotal changes (voucher applied)
  const taxRate   = rates?.tax.rate ?? 0
  const taxAmount = cart ? Math.round(cart.subtotal * taxRate * 100) / 100 : 0
  const taxInfo: TaxInfo | null = rates ? { ...rates.tax, amount: taxAmount } : null

  /* ── Voucher ── */
  const applyVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherCode.trim()) return
    setApplyingVoucher(true); setError('')
    try {
      const r = await smartFetch('/api/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({ code: voucherCode.trim(), cartTotal: cart?.subtotal ?? 0, productIds: cart?.items.map(i => i.productId) ?? [] }),
      })
      const d = await r.json()
      if (!r.ok || !d.success) { setError(d.error || 'Invalid voucher'); return }
      await fetchCart({ voucherCode: voucherCode.trim() })
      setVoucherCode('')
    } catch { setError('Failed to apply voucher') }
    finally { setApplyingVoucher(false) }
  }

  const removeVoucher = async (code: string) => { await fetchCart({ removeVoucher: code }) }

  /* ── Steps ── */
  const goDelivery = (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!user && !guestEmail.trim()) { setError('Email is required to continue'); return }
    if (!addr.name || !addr.line1 || !addr.city || !addr.zip) { setError('Please fill all address fields'); return }
    if (addr.country === 'US' && !addr.state) { setError('Please select your state'); return }
    setStep(2)
  }

  const goPayment = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!rates) { setError('Please wait for shipping rates to load'); return }

    // Reserve stock for 15 minutes to prevent race conditions
    try {
      const res = await smartFetch('/api/checkout/reserve', {
        method: 'POST',
        body: JSON.stringify({
          items: cart!.items.map(i => ({
            productId:  i.productId,
            variantSku: i.variantSku,
            quantity:   i.quantity,
          })),
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'One or more items is no longer available in the requested quantity.')
        return
      }
    } catch {
      // Non-fatal — proceed anyway; final stock check happens at order creation
    }

    setStep(3)
  }

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true); setError('')
    const sel = rates?.shipping[selectedIdx] ?? null
    try {
      const key = crypto.randomUUID()
      const orderRes = await smartFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart!.items.map(i => ({ productId: i.productId, variantSku: i.variantSku, quantity: i.quantity })),
          shippingAddress: { name: addr.name, address: addr.line1, city: addr.city, country: addr.country, zip: addr.zip },
          idempotencyKey: key,
          voucherCodes: cart!.vouchers.map(v => v.code),
          guestEmail: !user ? guestEmail : undefined,
          shippingAmount: hasFreeShippingVoucher ? 0 : (sel?.price ?? 0),
          taxAmount,
        }),
      })
      const od = await orderRes.json()
      if (!od.success) { setError(od.error || 'Order failed'); return }

      const payRes = await smartFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ orderId: od.order._id, sourceId: 'cnon:card-nonce-ok', idempotencyKey: crypto.randomUUID() }),
      })
      const pd = await payRes.json()
      if (pd.success) { setOrderId(od.order._id); setSuccess(true) }
      else setError(pd.error || 'Payment failed')
    } catch { setError('Something went wrong') }
    finally { setProcessing(false) }
  }

  /* ── Loading state ── */
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  // While redirect is in-flight, show nothing (avoids flash of raw JSX)
  if (cartEmpty || !cart) return null

  const selectedShipping      = rates?.shipping[selectedIdx] ?? null
  const hasFreeShippingVoucher = cart.vouchers?.some(v => v.code === 'FREESHIP') ?? false
  const shippingCost          = hasFreeShippingVoucher ? 0 : (selectedShipping?.price ?? 0)
  const grandTotal            = cart.total + shippingCost + taxAmount

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-500 mb-1">Thank you for your purchase.</p>
          {!user && <p className="text-xs text-gray-400 mb-1">A confirmation will be sent to <strong>{guestEmail}</strong></p>}
          <p className="text-xs text-gray-400 font-mono mb-8">#{orderId}</p>
          <button onClick={() => router.push('/products')} className="bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">Continue Shopping</button>
        </div>
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>
        <Steps step={step} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left */}
          <div className="lg:col-span-3 space-y-5">

            {/* ── STEP 1: DELIVERY ── */}
            {step === 1 && (
              <form onSubmit={goDelivery} className="space-y-5">
                {/* Contact */}
                <section className="border border-gray-200 rounded-xl p-5 space-y-4">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</h2>
                  {user ? (
                    <p className="text-sm text-gray-500">Logged in as <span className="font-medium text-gray-900">{user.email}</span></p>
                  ) : (
                    <>
                      <F label="Email" req>
                        <input
                          type="email" required
                          value={guestEmail}
                          onChange={e => setGuestEmail(e.target.value)}
                          className={cls.input}
                          placeholder="you@example.com"
                        />
                      </F>
                      <p className="text-xs text-gray-400">
                        Checking out as guest.{' '}
                        <a
                          href="/login"
                          onClick={() => sessionStorage.setItem('checkoutRedirect', '/checkout')}
                          className="text-gray-700 underline hover:text-gray-900"
                        >Sign in</a> to track your orders.
                      </p>
                    </>
                  )}
                </section>

                {/* Address */}
                <section className="border border-gray-200 rounded-xl p-5 space-y-4">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipping Address</h2>

                  <F label="Full Name" req>
                    <input type="text" required value={addr.name} onChange={e => setAddr({...addr, name: e.target.value})} className={cls.input} placeholder="Jane Smith" />
                  </F>

                  <F label="Country" req>
                    <select required value={addr.country} onChange={e => setAddr({...addr, country: e.target.value, state: ''})} className={cls.select}>
                      {ALL_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </F>

                  {addr.country === 'US' && (
                    <F label="State" req>
                      <select required value={addr.state} onChange={e => setAddr({...addr, state: e.target.value})} className={cls.select}>
                        <option value="">Select state…</option>
                        {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                      </select>
                    </F>
                  )}

                  <F label="Street Address" req>
                    <input type="text" required value={addr.line1} onChange={e => setAddr({...addr, line1: e.target.value})} className={cls.input} placeholder="123 Main St, Apt 4B" />
                  </F>

                  <div className="grid grid-cols-2 gap-3">
                    <F label="City" req>
                      <input type="text" required value={addr.city} onChange={e => setAddr({...addr, city: e.target.value})} className={cls.input} placeholder="New York" />
                    </F>
                    <F label="ZIP / Postal" req>
                      <input type="text" required value={addr.zip} onChange={e => setAddr({...addr, zip: e.target.value})} className={cls.input} placeholder="10001" />
                    </F>
                  </div>
                </section>

                {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
                <button type="submit" className={`${cls.btn} ${cls.btnPrimary}`}>Continue to Shipping →</button>
              </form>
            )}

            {/* ── STEP 2: SHIPPING & TAX ── */}
            {step === 2 && (
              <form onSubmit={goPayment} className="space-y-5">
                {/* Address recap */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{addr.name}</p>
                    <p className="text-gray-500">{addr.line1}, {addr.city}</p>
                    <p className="text-gray-500">{addr.state ? `${addr.state}, ` : ''}{addr.country} {addr.zip}</p>
                    {!user && <p className="text-gray-400 mt-0.5">{guestEmail}</p>}
                  </div>
                  <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-700 underline">Edit</button>
                </div>

                {/* Shipping options */}
                <section className="border border-gray-200 rounded-xl p-5 space-y-3">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipping Method</h2>

                  {ratesLoading && (
                    <div className="flex items-center gap-3 text-sm text-gray-400 py-3">
                      <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                      Fetching rates for {addr.country === 'US' ? `${addr.state}, US` : addr.country}…
                    </div>
                  )}

                  {!ratesLoading && rates?.shipping.map((opt, i) => (
                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedIdx === i ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="ship" checked={selectedIdx === i} onChange={() => setSelectedIdx(i)} className="accent-gray-900" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.carrier} · {opt.estimatedDays}</p>
                      </div>
                      <span className="text-sm font-semibold">{opt.price === 0 ? <span className="text-emerald-600">Free</span> : fmt(opt.price)}</span>
                    </label>
                  ))}

                  {!ratesLoading && !rates && (
                    <p className="text-sm text-gray-400">Select country{addr.country === 'US' ? ' & state' : ''} on the previous step to see rates.</p>
                  )}
                </section>

                {/* Tax info card */}
                {!ratesLoading && taxInfo && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
                    <p className="font-semibold text-blue-900 mb-2">{taxInfo.label} — {rates?.countryName}{region && region !== rates?.countryName ? `, ${region}` : ''}</p>
                    <div className="flex justify-between text-blue-700"><span>Rate</span><span>{(taxInfo.rate * 100).toFixed(2)}%</span></div>
                    <div className="flex justify-between text-blue-700 mt-1 font-medium"><span>{taxInfo.label} on {fmt(cart!.subtotal)}</span><span>{taxAmount > 0 ? fmt(taxAmount) : 'None'}</span></div>
                    {taxInfo.note && <p className="text-xs text-blue-500 mt-1">{taxInfo.note}</p>}
                    <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
                      <span className={`w-1.5 h-1.5 rounded-full ${rateSource === 'live' ? 'bg-emerald-400' : 'bg-blue-300'}`} />
                      {rateSource === 'live' ? 'Live rate from EU Commission' : 'Curated rate'}
                    </div>
                  </div>
                )}

                {/* No-tax countries */}
                {!ratesLoading && taxInfo && taxInfo.rate === 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700">
                    🎉 No {taxInfo.label} applies for {rates?.countryName}
                  </div>
                )}

                {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className={`flex-1 ${cls.btn} ${cls.btnOutline}`}>← Back</button>
                  <button type="submit" disabled={ratesLoading || !rates} className={`flex-[2] ${cls.btn} ${cls.btnPrimary}`}>Continue to Payment →</button>
                </div>
              </form>
            )}

            {/* ── STEP 3: PAYMENT ── */}
            {step === 3 && (
              <form onSubmit={placeOrder} className="space-y-5">
                {/* Summary recap */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Shipping to</span><span className="font-medium">{addr.city}, {addr.country}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span className="font-medium">{selectedShipping ? (shippingCost === 0 ? 'Free' : fmt(shippingCost)) : '—'}{selectedShipping && <span className="text-gray-400 font-normal ml-1">({selectedShipping.label})</span>}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">{taxInfo?.label ?? 'Tax'}</span><span className="font-medium">{taxAmount > 0 ? fmt(taxAmount) : '$0.00'}</span></div>
                  <button type="button" onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-gray-700 underline mt-1">Edit</button>
                </div>

                {/* Card */}
                <section className="border border-gray-200 rounded-xl p-5 space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Details</h2>
                    <p className="text-xs text-gray-400 mt-1">Square sandbox · test: 4111 1111 1111 1111</p>
                  </div>
                  <F label="Cardholder Name" req>
                    <input type="text" required value={card.name} onChange={e => setCard({...card, name: e.target.value})} className={cls.input} placeholder="Jane Smith" />
                  </F>
                  <F label="Card Number" req>
                    <input type="text" required maxLength={19} value={card.number}
                      onChange={e => { let v = e.target.value.replace(/\D/g,''); v = v.match(/.{1,4}/g)?.join(' ')||v; setCard({...card,number:v}) }}
                      className={cls.input} placeholder="4111 1111 1111 1111" />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Expiry (MM/YY)" req>
                      <input type="text" required maxLength={5} value={card.expiry}
                        onChange={e => { let v = e.target.value.replace(/\D/g,''); if(v.length>=2) v=v.slice(0,2)+'/'+v.slice(2); setCard({...card,expiry:v}) }}
                        className={cls.input} placeholder="12/28" />
                    </F>
                    <F label="CVV" req>
                      <input type="text" required maxLength={4} value={card.cvv}
                        onChange={e => setCard({...card, cvv: e.target.value.replace(/\D/g,'')})}
                        className={cls.input} placeholder="123" />
                    </F>
                  </div>
                </section>

                {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className={`flex-1 ${cls.btn} ${cls.btnOutline}`}>← Back</button>
                  <button type="submit" disabled={processing} className={`flex-[2] ${cls.btn} ${cls.btnPrimary}`}>
                    {processing
                      ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</span>
                      : `Pay ${fmt(grandTotal)}`
                    }
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-2">
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
      </div>
    </div>
  )
}
