'use client'

import { formatPrice } from '@/lib/utils/format'
import { useStoreSettings } from '@/lib/useStoreSettings'
import {
  evaluateFreeDelivery,
  freeDeliveryMessage,
  type CartItemForShipping,
} from '@/lib/freeDelivery'

interface FreeDeliveryBannerProps {
  items: CartItemForShipping[]
  className?: string
}

/**
 * Cart-side banner that surfaces the active free-delivery state, driven by
 * the singleton Settings doc (admin Dashboard → Free Delivery) + each
 * line item's per-product flag.
 *
 *  - Global free + no threshold      → "Free delivery on all orders"
 *  - Global free + threshold not met → "$X away" with a progress bar
 *  - Global free + threshold met     → "You've unlocked free delivery"
 *  - Some products marked free       → "Some items ship free"
 *  - Nothing applies                 → renders nothing
 */
export default function FreeDeliveryBanner({
  items,
  className = '',
}: FreeDeliveryBannerProps) {
  const { settings } = useStoreSettings()
  const evaluation = evaluateFreeDelivery({
    items,
    settings: settings.freeDelivery,
  })
  const msg = freeDeliveryMessage(evaluation)
  if (!msg) return null

  const eligible = evaluation.allFree || evaluation.thresholdMet
  const showProgressBar =
    evaluation.globalEnabled &&
    evaluation.threshold != null &&
    !evaluation.thresholdMet

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <p
          className={`text-[11px] tracking-wide font-semibold flex items-center gap-2 ${
            eligible ? 'text-[var(--color-gold)]' : 'text-[var(--color-ink)]'
          }`}
        >
          <i className="ri-truck-line" />
          {msg.headline}
        </p>
        {showProgressBar && (
          <span className="text-[10px] font-semibold text-[var(--color-gold)] whitespace-nowrap">
            {formatPrice(evaluation.remainingForThreshold)} away
          </span>
        )}
      </div>

      {showProgressBar && (
        <div
          className="h-1 bg-[var(--color-border-soft)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(msg.progress * 100)}
        >
          <div
            className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-500"
            style={{ width: `${Math.round(msg.progress * 100)}%` }}
          />
        </div>
      )}

      {msg.detail && (
        <p className="text-[10px] text-gray-500 mt-1.5">{msg.detail}</p>
      )}
    </div>
  )
}
