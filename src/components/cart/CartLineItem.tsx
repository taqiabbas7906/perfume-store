'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { CartItem } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils/format'
import QuantityStepper from './QuantityStepper'

interface CartLineItemProps {
  item: CartItem
  variant: 'page' | 'panel'
  onUpdateQty: (sku: string, qty: number) => void
  onRemove: (sku: string) => void
}

export default function CartLineItem({
  item,
  variant,
  onUpdateQty,
  onRemove,
}: CartLineItemProps) {
  if (variant === 'panel') {
    return (
      <article className="flex gap-4 border-b border-[var(--color-cream-400)] pb-5 last:border-0 group animate-fadeIn">
        <div className="relative w-20 h-24 flex-shrink-0 bg-[var(--color-cream-500)] overflow-hidden">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="80px"
              className="object-cover object-top"
            />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          {item.brand && (
            <p className="text-[9px] text-[var(--color-gold)] tracking-[0.3em] uppercase font-bold">
              {item.brand}
            </p>
          )}
          <h3 className="text-xs font-semibold text-[var(--color-ink)] mt-0.5 leading-snug truncate">
            {item.name}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {item.variantLabel}
          </p>

          <div className="flex items-center justify-between mt-3">
            <QuantityStepper
              quantity={item.quantity}
              onDecrease={() => onUpdateQty(item.variantSku, item.quantity - 1)}
              onIncrease={() => onUpdateQty(item.variantSku, item.quantity + 1)}
              containerClassName="flex items-center border border-[var(--color-border)]"
              buttonClassName="w-7 h-7 flex items-center justify-center text-[var(--color-ink)] hover:text-[var(--color-gold)] text-xs transition-colors"
              quantityClassName="w-7 h-7 flex items-center justify-center text-xs font-semibold text-[var(--color-ink)]"
            />
            <span className="text-sm font-bold text-[var(--color-ink)]">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.variantSku)}
          className="self-start w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Remove item"
        >
          <i className="ri-delete-bin-line text-sm" aria-hidden="true" />
        </button>
      </article>
    )
  }

  return (
    <article className="flex gap-5 border-b border-[var(--color-border-soft)] py-6 last:border-0 group">
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
        <p className="text-[11px] text-gray-400 mt-1">{item.variantLabel}</p>

        <div className="flex items-center gap-4 mt-4">
          <QuantityStepper
            quantity={item.quantity}
            onDecrease={() => onUpdateQty(item.variantSku, item.quantity - 1)}
            onIncrease={() => onUpdateQty(item.variantSku, item.quantity + 1)}
            containerClassName="flex items-center border border-[var(--color-border)]"
            buttonClassName="w-8 h-8 flex items-center justify-center text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
            quantityClassName="w-8 h-8 flex items-center justify-center text-xs font-semibold text-[var(--color-ink)] border-x border-[var(--color-border)]"
            iconClassName="text-sm"
          />
          <button
            type="button"
            onClick={() => onRemove(item.variantSku)}
            className="text-[10px] tracking-[0.2em] uppercase font-semibold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1.5"
          >
            <i className="ri-delete-bin-line" aria-hidden="true" />
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
    </article>
  )
}
