/**
 * Free-delivery rules — one pure function the storefront UI, cart
 * progress bar, and server-side order pricing all consume so the rules
 * stay consistent.
 *
 * Inputs:
 *   - `settings.freeDelivery`: store-wide configuration
 *   - `items`: every cart line item with `price`, `quantity`, and the
 *     per-product `freeDelivery` flag
 *
 * Rules (in order of precedence):
 *   1. Global free + no threshold (or threshold = 0): every line ships free.
 *   2. Global free + threshold met: every line ships free.
 *   3. Global free + threshold not met: only product-level free items
 *      ship free; the remaining items still pay shipping based on their
 *      own subtotal.
 *   4. Global free OFF: only product-level free items ship free; the rest
 *      are charged normally.
 *
 * The "shippable subtotal" we return is what the carrier-rate calculator
 * should be billed against — it excludes any line that ships free.
 */

export interface FreeDeliverySettings {
  enabled: boolean
  threshold: number
}

export interface CartItemForShipping {
  price: number
  quantity: number
  /** Per-product flag set in the admin product editor. */
  freeDelivery?: boolean
}

export interface FreeDeliveryEvaluation {
  /** True when every line in the cart ships free (no shipping charge at all). */
  allFree: boolean
  /** True when at least one (but not every) line ships free. */
  someFree: boolean
  /**
   * Subtotal that should be billed for shipping — sum of (price × qty) for
   * lines that are NOT eligible for free delivery. The shipping rate
   * engine should be asked for the cost of this amount, not the whole
   * cart total.
   */
  shippableSubtotal: number
  /** Total cart subtotal regardless of free-delivery rules. */
  cartSubtotal: number
  /** "global" when the entire cart is free because of store-wide config,
   *  "product" when only individual product flags apply, null otherwise. */
  reason: 'global' | 'product' | null
  /** Threshold currently in effect, or null when no threshold is configured. */
  threshold: number | null
  /** Distance left to hit the threshold (≥0). 0 when already met or N/A. */
  remainingForThreshold: number
  /** Mirror of the underlying setting for convenience. */
  globalEnabled: boolean
  /** True when the threshold path is active and the cart has met it. */
  thresholdMet: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function evaluateFreeDelivery(args: {
  items: CartItemForShipping[]
  settings: FreeDeliverySettings | undefined | null
}): FreeDeliveryEvaluation {
  const settings = args.settings ?? { enabled: false, threshold: 0 }
  const globalEnabled = !!settings.enabled
  const threshold = settings.threshold > 0 ? settings.threshold : null

  const cartSubtotal = round2(
    args.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  )

  // Per-item subtotals partitioned by free-delivery eligibility.
  let productFreeSubtotal = 0
  let paidSubtotal = 0
  let everyItemIsProductFree = args.items.length > 0
  for (const item of args.items) {
    const line = item.price * item.quantity
    if (item.freeDelivery) productFreeSubtotal += line
    else {
      paidSubtotal += line
      everyItemIsProductFree = false
    }
  }
  productFreeSubtotal = round2(productFreeSubtotal)
  paidSubtotal = round2(paidSubtotal)

  // Decide global eligibility.
  const thresholdMet = globalEnabled && threshold != null && cartSubtotal >= threshold
  const globalFreeForAll =
    globalEnabled && (threshold == null || thresholdMet)

  if (globalFreeForAll) {
    return {
      allFree: true,
      someFree: true,
      shippableSubtotal: 0,
      cartSubtotal,
      reason: 'global',
      threshold,
      remainingForThreshold: 0,
      globalEnabled,
      thresholdMet,
    }
  }

  // Only product-level overrides remain.
  const allFreeFromProducts = everyItemIsProductFree && args.items.length > 0
  const remaining =
    threshold != null && cartSubtotal < threshold
      ? round2(threshold - cartSubtotal)
      : 0

  return {
    allFree: allFreeFromProducts,
    someFree: productFreeSubtotal > 0,
    shippableSubtotal: paidSubtotal,
    cartSubtotal,
    reason: allFreeFromProducts ? 'product' : null,
    threshold,
    remainingForThreshold: remaining,
    globalEnabled,
    thresholdMet,
  }
}

/**
 * Build a human-readable progress message for the cart progress bar.
 * Returns null when there's nothing meaningful to surface (free-delivery
 * disabled and no items qualify by product flag either).
 */
export function freeDeliveryMessage(evaluation: FreeDeliveryEvaluation): {
  headline: string
  detail?: string
  /** 0–1 progress for a threshold bar. 1 when fully eligible or N/A. */
  progress: number
} | null {
  if (evaluation.allFree && evaluation.reason === 'global') {
    return {
      headline: 'Free delivery on all orders',
      progress: 1,
    }
  }
  if (evaluation.allFree && evaluation.reason === 'product') {
    return {
      headline: 'Your entire order ships free',
      progress: 1,
    }
  }
  if (evaluation.globalEnabled && evaluation.threshold != null) {
    if (evaluation.thresholdMet) {
      return {
        headline: "You've unlocked free delivery",
        progress: 1,
      }
    }
    const remaining = evaluation.remainingForThreshold
    const progress =
      evaluation.threshold > 0
        ? Math.min(1, evaluation.cartSubtotal / evaluation.threshold)
        : 0
    return {
      headline: `Spend $${remaining.toFixed(2)} more to unlock free delivery`,
      progress,
    }
  }
  if (evaluation.someFree) {
    return {
      headline: 'Some items in your order ship free',
      detail: 'Standard shipping applies to the remaining items.',
      progress: 0,
    }
  }
  return null
}
