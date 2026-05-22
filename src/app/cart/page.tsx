'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { CartPageSkeleton } from '@/components/ui/Skeleton'
import CartLineItem from '@/components/cart/CartLineItem'
import CartOrderSummary from '@/components/cart/CartOrderSummary'


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
        <section className="max-w-lg mx-auto px-6 text-center py-20">
          <div className="w-20 h-20 flex items-center justify-center border border-[var(--color-border)] rounded-full mx-auto mb-6">
            <i
              className="ri-shopping-bag-line text-4xl text-[var(--color-gold)]"
              aria-hidden="true"
            />
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
            <i className="ri-store-2-line" aria-hidden="true" />
            Browse the Shop
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-32 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-10">
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
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <section className="lg:col-span-2 space-y-1" aria-label="Cart items">
            {items.map((item) => (
              <CartLineItem
                key={item.variantSku}
                item={item}
                variant="page"
                onUpdateQty={updateQty}
                onRemove={removeItem}
              />
            ))}
          </section>

          <CartOrderSummary
            subtotal={subtotal}
            total={total}
            discount={discount}
            vouchers={vouchers}
            voucherCode={voucherCode}
            setVoucherCode={(code) => {
              setVoucherCode(code)
              setError('')
            }}
            applying={applying}
            error={error}
            isSyncing={isSyncing}
            items={items}
            onApplyVoucher={handleApplyVoucher}
            onRemoveVoucher={removeVoucher}
          />
        </div>
      </div>
    </main>
  )
}
