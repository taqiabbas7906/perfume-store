import mongoose, { Types, ClientSession } from 'mongoose'
import Order from '@/models/Order'
import Product from '@/models/Product'
import Cart from '@/models/Cart'
import User from '@/models/User'
import { getOrCreateCart, clearCart, summarizeCart } from '@/lib/services/cartService'
import {
  validateVoucher,
  incrementVoucherUsage,
} from '@/lib/services/voucherService'
import {
  decrementStockBatch,
  restoreStock,
  releaseReservation,
  type DecrementInput,
} from '@/lib/inventory'
import type { ICart, IOrder, IOrderStatusEntry, IProduct, IShippingAddress, OrderStatus } from '@/types'
import type { IOrderLog } from '@/types'
import { logger } from '@/lib/logger'
import { sendEmail, buildOrderConfirmationEmail, buildStatusUpdateEmail } from '@/lib/email'
import { getWorldRates } from '@/lib/worldRates'
import { getSettings } from '@/models/Settings'
import { evaluateFreeDelivery } from '@/lib/freeDelivery'

/* ───────────────────────────────────────────── */

interface BuyNowItem {
  productId: string
  variantSku: string
  quantity: number
}

export interface CreateOrderInput {
  userId?: string
  guestEmail?: string
  sessionId?: string
  idempotencyKey: string
  shippingAddress: IShippingAddress
  buyNow?: BuyNowItem
  voucherCodes?: string[]
  log: IOrderLog
  shippingAmount?: number
  taxAmount?: number
}

export type CreateOrderResult =
  | { ok: true; order: IOrder; created: boolean }
  | {
      ok: false
      code: 'EMPTY_CART' | 'PRODUCT_UNAVAILABLE' | 'OUT_OF_STOCK' | 'INTERNAL'
      message: string
      sku?: string
    }

/* ───────────────────────────────────────────── */

interface NormalizedLine {
  productId: Types.ObjectId
  variantSku: string
  quantity: number
  name: string
  variantLabel: string
  unitPrice: number
  image: string
}

/* ───────────────────────────────────────────── */
/* SAFE OBJECTID */
/* ───────────────────────────────────────────── */

const toObjectId = (id: unknown): Types.ObjectId | null => {
  if (!id) return null
  if (id instanceof Types.ObjectId) return id
  if (typeof id !== 'string') return null
  if (!Types.ObjectId.isValid(id)) return null
  return new Types.ObjectId(id)
}

/* ───────────────────────────────────────────── */

async function normalizeLines(
  cart: ICart | null,
  buyNow?: BuyNowItem
): Promise<
  | { lines: NormalizedLine[] }
  | { code: 'EMPTY_CART' | 'PRODUCT_UNAVAILABLE'; sku?: string }
> {
  const sourceLines = buyNow
    ? [
        {
          productId: toObjectId(buyNow.productId),
          variantSku: buyNow.variantSku,
          quantity: buyNow.quantity,
        },
      ]
    : (cart?.items ?? []).map((i) => {
        const item = i as { productId: unknown; variantSku: string; quantity: number }
        return {
          productId: toObjectId(item.productId),
          variantSku: item.variantSku,
          quantity: item.quantity,
        }
      })

  if (!sourceLines.length) return { code: 'EMPTY_CART' }

  const validLines = sourceLines.filter(
    (l): l is { productId: Types.ObjectId; variantSku: string; quantity: number } =>
      !!l.productId
  )

  const productIds = [
    ...new Set(validLines.map((l) => l.productId.toString())),
  ].map((id) => new Types.ObjectId(id))

  const products = await Product.find({
    _id: { $in: productIds },
    active: true,
  }).lean<IProduct[]>()

  const byId = new Map(products.map((p) => [p._id.toString(), p]))

  const lines: NormalizedLine[] = []

  for (const l of validLines) {
    const p = byId.get(l.productId.toString())
    if (!p) return { code: 'PRODUCT_UNAVAILABLE', sku: l.variantSku }

    const variant = p.variants.find((v) => v.sku === l.variantSku)
    if (!variant) return { code: 'PRODUCT_UNAVAILABLE', sku: l.variantSku }

    lines.push({
      productId: p._id,
      variantSku: variant.sku,
      quantity: l.quantity,
      name: p.name,
      variantLabel: variant.label,
      unitPrice: variant.discountedPrice ?? variant.originalPrice,
      image: p.images?.[0]?.url ?? variant.images?.[0] ?? '',
    })
  }

  return { lines }
}

/* ───────────────────────────────────────────── */
/* CREATE ORDER (SAFE + IDENTITY GUARANTEED) */
/* ───────────────────────────────────────────── */

async function calculateServerShipping(args: {
  subtotal: number
  discount: number
  shippingAddress: IShippingAddress
  requestedAmount?: number
  forceFree: boolean
  /**
   * The subset of the cart that should actually be charged shipping. For
   * mixed carts (some items product-level free, others not) this is the
   * non-free items' subtotal. Defaults to `subtotal - discount` so the
   * original behaviour is preserved when callers don't pass it.
   */
  shippableSubtotal?: number
}): Promise<number> {
  if (args.forceFree) return 0

  const fallbackBase = Math.max(0, round2(args.subtotal - args.discount))
  const billable = round2(
    args.shippableSubtotal != null ? args.shippableSubtotal : fallbackBase,
  )

  // If the only items left to ship are free-delivery products, there's
  // nothing to charge for.
  if (billable <= 0) return 0

  const rates = await getWorldRates({
    country: args.shippingAddress.country,
    city: args.shippingAddress.city,
    state: args.shippingAddress.state,
    subtotal: billable,
    postalCode: args.shippingAddress.zip,
  })

  const requested = round2(args.requestedAmount ?? Number.NaN)
  const allowed = rates.shipping.map((option) => round2(option.price))

  if (Number.isFinite(requested) && allowed.includes(requested)) {
    return requested
  }

  const standard = rates.shipping[0]?.price
  return round2(typeof standard === 'number' ? standard : 0)
}

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const userId = input.userId ? toObjectId(input.userId) : null

  if (!userId && !input.guestEmail) {
    return {
      ok: false,
      code: 'INTERNAL',
      message: 'Either userId or guestEmail is required',
    }
  }

  const existingFilter: any = { idempotencyKey: input.idempotencyKey }
  if (userId) existingFilter.user = userId
  if (input.guestEmail) existingFilter.guestEmail = input.guestEmail

  const existing = await Order.findOne(existingFilter).lean<IOrder>()

  if (existing) {
    return { ok: true, order: existing, created: false }
  }

  const cart = input.buyNow
    ? null
    : userId
    ? await getOrCreateCart({ userId: input.userId })
    : input.sessionId
    ? await getOrCreateCart({ sessionId: input.sessionId })
    : null

  const norm = await normalizeLines(cart, input.buyNow)

  if ('code' in norm) {
    return {
      ok: false,
      code: norm.code,
      message:
        norm.code === 'EMPTY_CART'
          ? 'Cart is empty'
          : `Product unavailable for SKU ${norm.sku ?? ''}`,
      sku: norm.sku,
    }
  }

  const lines = norm.lines

  const decInputs: DecrementInput[] = lines.map((l) => ({
    productId: l.productId,
    variantSku: l.variantSku,
    quantity: l.quantity,
  }))

  const subtotal = round2(
    lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  )

  let discount = 0
  const voucherUsedIds: Types.ObjectId[] = []
  const voucherDiscounts: Array<{
    voucherId: Types.ObjectId
    discountAmount: number
  }> = []

  if (cart && cart.vouchers && cart.vouchers.length > 0) {
    const productIdsInCart = lines.map((l) => l.productId)
    const products = await Product.find({
      _id: { $in: productIdsInCart },
    }).lean<IProduct[]>()
    const categoryIdsInCart = products.map((p) => p.category)

    for (const cartVoucher of cart.vouchers) {
      const validation = await validateVoucher({
        voucherCode: cartVoucher.code,
        cartTotal: subtotal,
        productIdsInCart,
        categoryIdsInCart,
        userId: input.userId,
        guestEmail: input.guestEmail,
        guestIp: input.log.ipAddress,
      })

      if (validation.ok) {
        discount += validation.discountAmount
        voucherUsedIds.push(validation.voucher._id)
        voucherDiscounts.push({
          voucherId: validation.voucher._id,
          discountAmount: validation.discountAmount,
        })
      }
    }
  }

  discount = Math.min(discount, subtotal)

  // Detect free shipping voucher
  const hasFreeShippingVoucher = cart?.vouchers?.some(v => v.code === 'FREESHIP') ?? false

  /**
   * Free-delivery evaluation — authoritative server-side check used for
   * actual order pricing (not just UI). Combines:
   *   - Store-wide setting (admin Dashboard → Free Delivery)
   *   - Per-product `freeDelivery` flag
   *   - Cart subtotal against any configured threshold
   *
   * Returns:
   *   `allFree`            → every line ships free, set forceFree below
   *   `shippableSubtotal`  → billed to the rate engine when not allFree
   */
  let freeDeliveryEvaluation = evaluateFreeDelivery({ items: [], settings: null })
  if (!hasFreeShippingVoucher) {
    const productIdsForFreeCheck = lines.map((l) => l.productId)
    const productsForFreeCheck = await Product.find({
      _id: { $in: productIdsForFreeCheck },
    })
      .select('_id freeDelivery')
      .lean<{ _id: Types.ObjectId; freeDelivery?: boolean }[]>()
    const freeByProductId = new Map(
      productsForFreeCheck.map((p) => [p._id.toString(), !!p.freeDelivery]),
    )

    const settings = await getSettings()
    freeDeliveryEvaluation = evaluateFreeDelivery({
      items: lines.map((l) => ({
        price: l.unitPrice,
        quantity: l.quantity,
        freeDelivery: freeByProductId.get(l.productId.toString()) ?? false,
      })),
      settings: settings.freeDelivery,
    })
  }

  const session = await safeStartSession()

  try {
    if (session) session.startTransaction()

    const dec = await decrementStockBatch(decInputs, session ?? undefined, { reason: 'order_placed' })

    if (!dec.ok) {
      if (session) await session.abortTransaction()

      return {
        ok: false,
        code: 'OUT_OF_STOCK',
        message: `Insufficient stock for SKU ${dec.failedSku}`,
        sku: dec.failedSku,
      }
    }
    const shippingCost = await calculateServerShipping({
      subtotal,
      discount,
      shippingAddress: input.shippingAddress,
      requestedAmount: input.shippingAmount,
      forceFree: hasFreeShippingVoucher || freeDeliveryEvaluation.allFree,
      shippableSubtotal: hasFreeShippingVoucher
        ? undefined
        : freeDeliveryEvaluation.shippableSubtotal,
    })

    /* SERVER-SIDE TAX COMPUTATION
     *
     * Never trust client-supplied taxAmount. A malicious payload could pass a
     * negative value to discount the order. Recompute from the shipping address. */
    let taxCost = 0
    try {
      const taxableBase = Math.max(0, round2(subtotal - discount))
      const rates = await getWorldRates({
        country: input.shippingAddress.country,
        city: input.shippingAddress.city,
        state: input.shippingAddress.state,
        subtotal: taxableBase,
        postalCode: input.shippingAddress.zip,
      })
      taxCost = round2(rates.tax.amount)
    } catch (err) {
      logger.warn({ err, country: input.shippingAddress.country }, 'tax computation failed; defaulting to 0')
      taxCost = 0
    }

    const orderPayload: any = {
      user: userId,
      guestEmail: input.guestEmail,
      guestSessionId: userId ? undefined : input.sessionId,

      items: lines.map((l) => ({
        productId: l.productId,
        variantSku: l.variantSku,
        name: l.name,
        variantLabel: l.variantLabel,
        price: l.unitPrice,
        quantity: l.quantity,
        image: l.image,
        subtotal: round2(l.unitPrice * l.quantity),
      })),

      shippingAddress: input.shippingAddress,

      status: 'pending',
      paymentStatus: 'pending',

      subtotal,
      discount,
      shipping: shippingCost,
      tax: taxCost,
      totalAmount: round2(subtotal - discount + shippingCost + taxCost),
      currency: 'USD',
      vouchersUsed: voucherUsedIds,

      idempotencyKey: input.idempotencyKey,
      paymentIntentId: '',
      inventoryReleased: false,
      orderLog: input.log,
      statusHistory: [
        {
          status: 'pending',
          changedAt: new Date(),
          changedBy: input.userId ? 'customer' : 'system',
          note: 'Order placed',
        },
      ],
    }

    const [order] = await Order.insertMany([orderPayload], {
      session: session ?? undefined,
    })

    if (!input.buyNow && input.userId) {
      await clearCart({ userId: input.userId }, session ?? undefined)
    } else if (!input.buyNow && input.sessionId) {
      await clearCart({ sessionId: input.sessionId }, session ?? undefined)
    } else if (!input.buyNow && cart?.sessionId) {
      await clearCart({ sessionId: cart.sessionId }, session ?? undefined)
    }

    if (session) await session.commitTransaction()

    // Release any cart reservation held during checkout
    const reservationKey = input.userId ?? input.sessionId ?? input.guestEmail
    if (reservationKey) void releaseReservation(reservationKey).catch(() => {})

    for (const { voucherId, discountAmount } of voucherDiscounts) {
      await incrementVoucherUsage({
        voucherId,
        userId: input.userId,
        orderId: order._id.toString(),
        guestEmail: input.guestEmail,
        guestIp: input.log.ipAddress,
        discountAmount,
        session: undefined,
      })
    }

    logger.info({ orderId: order._id }, 'order created')

    // Fire confirmation email (non-blocking)
    void resolveOrderEmail(order as IOrder).then(async (recipient) => {
      if (!recipient) return
      const tpl = await buildOrderConfirmationEmail(order as IOrder, recipient.name)
      return sendEmail(recipient.email, tpl.subject, tpl.html)
    }).catch((err) => logger.warn({ err }, 'order confirmation email failed'))

    return { ok: true, order: order as IOrder, created: true }
  } catch (err) {
    if (session) await session.abortTransaction().catch(() => {})

    for (const item of decInputs) {
      await restoreStock(item, undefined, { reason: 'rollback' }).catch(() => {})
    }

    logger.error({ err }, 'createOrder failed')

    return { ok: false, code: 'INTERNAL', message: 'Order creation failed' }
  } finally {
    session?.endSession()
  }
}

/* ───────────────────────────────────────────── */
/* INVENTORY RELEASE (FIXED FOR CONCURRENCY) */
/* ───────────────────────────────────────────── */

export async function releaseOrderInventory(orderId: string): Promise<void> {
  /* Atomic CAS: only the caller that flips `inventoryReleased` from false→true
   * proceeds. Concurrent webhook + admin cancel cannot double-restore stock. */
  const order = await Order.findOneAndUpdate(
    { _id: orderId, inventoryReleased: false },
    { $set: { inventoryReleased: true } },
    { returnDocument: 'before', projection: { items: 1 } }
  ).lean<{ items: IOrder['items'] } | null>()

  if (!order) return

  for (const item of order.items) {
    await restoreStock(
      { productId: item.productId, variantSku: item.variantSku, quantity: item.quantity },
      undefined,
      { reason: 'order_cancelled', orderId }
    ).catch(err => {
      logger.warn({ err, orderId }, 'stock restore failed')
    })
  }
}

/* ───────────────────────────────────────────── */

async function safeStartSession() {
  try {
    return await mongoose.startSession()
  } catch {
    return null
  }
}

async function resolveOrderEmail(order: IOrder): Promise<{ email: string; name: string } | null> {
  if (order.guestEmail) {
    return { email: order.guestEmail, name: order.shippingAddress.name }
  }
  if (order.user) {
    const u = await User.findById(order.user).select('name email').lean<{ name: string; email: string }>()
    if (u?.email) return { email: u.email, name: u.name ?? order.shippingAddress.name }
  }
  return null
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/* ───────────────────────────────────────────── */
/* ADMIN: STATUS TRANSITION WITH TIMELINE        */
/* ───────────────────────────────────────────── */

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['paid', 'failed', 'cancelled'],
  paid:      ['shipped', 'cancelled', 'refunded'],
  shipped:   ['delivered', 'refunded'],
  delivered: ['refunded'],
  failed:    ['cancelled', 'pending'],
  cancelled: [],
  refunded:  [],
}

export type StatusChangeInput = {
  orderId: string
  nextStatus: OrderStatus
  changedBy: 'admin' | 'system' | 'customer' | 'webhook'
  adminId?: string
  note?: string
}

export type StatusChangeResult =
  | { ok: true; order: IOrder; previousStatus: OrderStatus }
  | { ok: false; code: 'NOT_FOUND' | 'INVALID_TRANSITION' | 'INTERNAL'; message: string }

export async function transitionOrderStatus(
  input: StatusChangeInput
): Promise<StatusChangeResult> {
  const head = await Order.findById(input.orderId).select('status').lean<{ status: OrderStatus }>()
  if (!head) return { ok: false, code: 'NOT_FOUND', message: 'Order not found' }

  const previous = head.status
  if (previous === input.nextStatus) {
    const same = await Order.findById(input.orderId).lean<IOrder>()
    if (!same) return { ok: false, code: 'NOT_FOUND', message: 'Order not found' }
    return { ok: true, order: same, previousStatus: previous }
  }

  const allowed = VALID_TRANSITIONS[previous] || []
  if (!allowed.includes(input.nextStatus)) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: `Cannot move order from "${previous}" to "${input.nextStatus}"`,
    }
  }

  const entry: IOrderStatusEntry = {
    status: input.nextStatus,
    changedAt: new Date(),
    changedBy: input.changedBy,
    adminId: input.adminId ? toObjectId(input.adminId) ?? undefined : undefined,
    note: input.note,
  }

  const set: Record<string, unknown> = { status: input.nextStatus }
  if (input.nextStatus === 'paid') {
    set.paymentStatus = 'completed'
    set.paidAt = new Date()
  } else if (input.nextStatus === 'cancelled') {
    set.cancelledAt = new Date()
    if (input.note) set.cancelReason = input.note
  } else if (input.nextStatus === 'refunded') {
    set.paymentStatus = 'refunded'
  } else if (input.nextStatus === 'failed') {
    set.paymentStatus = 'failed'
  }

  /* Atomic compare-and-swap: only update if status is still `previous`.
   * Prevents two concurrent transitions from both winning. */
  const updated = await Order.findOneAndUpdate(
    { _id: input.orderId, status: previous },
    { $set: set, $push: { statusHistory: entry } },
    { returnDocument: 'after' }
  ).lean<IOrder>()

  if (!updated) {
    return { ok: false, code: 'INVALID_TRANSITION', message: 'Order status changed concurrently' }
  }

  /* Restore inventory for terminal-with-stock states.
   * Idempotent via the order's `inventoryReleased` flag. */
  const RELEASE_INVENTORY: OrderStatus[] = ['cancelled', 'refunded', 'failed']
  if (RELEASE_INVENTORY.includes(input.nextStatus)) {
    await releaseOrderInventory(input.orderId).catch((err) =>
      logger.warn({ err, orderId: input.orderId }, 'inventory release failed')
    )
  }

  const EMAIL_STATUSES = ['paid', 'shipped', 'delivered', 'cancelled', 'refunded']
  if (EMAIL_STATUSES.includes(input.nextStatus)) {
    void resolveOrderEmail(updated).then(async (recipient) => {
      if (!recipient) return
      const tpl = await buildStatusUpdateEmail(updated, recipient.name, input.nextStatus)
      if (!tpl) return
      return sendEmail(recipient.email, tpl.subject, tpl.html)
    }).catch((err) => logger.warn({ err }, 'status update email failed'))
  }

  return { ok: true, order: updated, previousStatus: previous }
}

/* ───────────────────────────────────────────── */
/* ADMIN: CANCEL ORDER + INVENTORY RESTORE       */
/* ───────────────────────────────────────────── */

export type CancelOrderResult =
  | { ok: true; order: IOrder; previousStatus: OrderStatus }
  | { ok: false; code: 'NOT_FOUND' | 'INVALID_TRANSITION' | 'INTERNAL'; message: string }

export async function cancelOrderAsAdmin(input: {
  orderId: string
  adminId: string
  reason?: string
}): Promise<CancelOrderResult> {
  const transition = await transitionOrderStatus({
    orderId: input.orderId,
    nextStatus: 'cancelled',
    changedBy: 'admin',
    adminId: input.adminId,
    note: input.reason ?? 'Cancelled by admin',
  })

  if (!transition.ok) return transition

  // Restore inventory (idempotent via inventoryReleased flag)
  await releaseOrderInventory(input.orderId)

  // Re-read to surface updated inventoryReleased flag
  const fresh = await Order.findById(input.orderId).lean<IOrder>()
  return {
    ok: true,
    order: fresh ?? transition.order,
    previousStatus: transition.previousStatus,
  }
}

/* ───────────────────────────────────────────── */
/* ADMIN: ADD TRACKING NUMBER + MARK SHIPPED     */
/* ───────────────────────────────────────────── */

export type AddTrackingResult =
  | { ok: true; order: IOrder; alreadyShipped: boolean }
  | { ok: false; code: 'NOT_FOUND' | 'INVALID_STATUS' | 'INTERNAL'; message: string }

export async function addOrderTracking(input: {
  orderId: string
  adminId: string
  trackingNumber: string
  trackingCarrier: string
  trackingUrl?: string
}): Promise<AddTrackingResult> {
  const order = await Order.findById(input.orderId)
  if (!order) return { ok: false, code: 'NOT_FOUND', message: 'Order not found' }

  if (order.status !== 'paid' && order.status !== 'shipped') {
    return {
      ok: false,
      code: 'INVALID_STATUS',
      message: `Tracking can only be added to paid or shipped orders (current: ${order.status})`,
    }
  }

  const alreadyShipped = order.status === 'shipped'
  const set: Record<string, unknown> = {
    trackingNumber: input.trackingNumber,
    trackingCarrier: input.trackingCarrier,
    trackingUrl: input.trackingUrl || undefined,
  }
  const push: Record<string, unknown> = {}

  if (!alreadyShipped) {
    set.status = 'shipped'
    set.shippedAt = new Date()
    push.statusHistory = {
      status: 'shipped' as OrderStatus,
      changedAt: new Date(),
      changedBy: 'admin' as const,
      adminId: toObjectId(input.adminId) ?? undefined,
      note: `Tracking added: ${input.trackingCarrier} ${input.trackingNumber}`,
    }
  } else {
    // Updating tracking on an already-shipped order — still log it
    push.statusHistory = {
      status: 'shipped' as OrderStatus,
      changedAt: new Date(),
      changedBy: 'admin' as const,
      adminId: toObjectId(input.adminId) ?? undefined,
      note: `Tracking updated: ${input.trackingCarrier} ${input.trackingNumber}`,
    }
  }

  const updated = await Order.findByIdAndUpdate(
    order._id,
    { $set: set, $push: push },
    { returnDocument: 'after' }
  ).lean<IOrder>()

  if (!updated) return { ok: false, code: 'INTERNAL', message: 'Update failed' }
  return { ok: true, order: updated, alreadyShipped }
}
