import mongoose, { Types, ClientSession } from 'mongoose'
import Order from '@/models/Order'
import Product from '@/models/Product'
import Cart from '@/models/Cart'
import { getOrCreateCart, clearCart, summarizeCart } from '@/lib/services/cartService'
import {
  validateVoucher,
  incrementVoucherUsage,
} from '@/lib/services/voucherService'
import {
  decrementStockBatch,
  restoreStock,
  type DecrementInput,
} from '@/lib/inventory'
import type { ICart, IOrder, IProduct, IShippingAddress } from '@/types'
import type { IOrderLog } from '@/types'
import { logger } from '@/lib/logger'

/* ───────────────────────────────────────────── */

interface BuyNowItem {
  productId: string
  variantSku: string
  quantity: number
}

export interface CreateOrderInput {
  userId?: string
  guestEmail?: string
  idempotencyKey: string
  shippingAddress: IShippingAddress
  buyNow?: BuyNowItem
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

  // Check if all products have freeDelivery flag
  let allProductsHaveFreeDelivery = false
  if (!hasFreeShippingVoucher) {
    const productIdsForFreeCheck = lines.map((l) => l.productId)
    const productsForFreeCheck = await Product.find({
      _id: { $in: productIdsForFreeCheck },
    }).lean<IProduct[]>()
    allProductsHaveFreeDelivery =
      productsForFreeCheck.length > 0 &&
      productsForFreeCheck.every((p) => p.freeDelivery === true)
  }

  const session = await safeStartSession()

  try {
    if (session) session.startTransaction()

    const dec = await decrementStockBatch(decInputs, session ?? undefined)

    if (!dec.ok) {
      if (session) await session.abortTransaction()

      return {
        ok: false,
        code: 'OUT_OF_STOCK',
        message: `Insufficient stock for SKU ${dec.failedSku}`,
        sku: dec.failedSku,
      }
    }

  const shippingCost = (hasFreeShippingVoucher || allProductsHaveFreeDelivery)
    ? 0
    : round2(input.shippingAmount ?? 0)
  const taxCost = round2(input.taxAmount ?? 0)

    const orderPayload: any = {
      user: userId,
      guestEmail: input.guestEmail,

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
    }

    const [order] = await Order.insertMany([orderPayload], {
      session: session ?? undefined,
    })

    if (!input.buyNow && input.userId) {
      await clearCart({ userId: input.userId }, session ?? undefined)
    } else if (!input.buyNow && cart) {
      if (cart.sessionId) {
        await Cart.updateOne(
          { sessionId: cart.sessionId },
          { $set: { vouchers: [] } },
          session ? { session } : {}
        )
      }
    }

    if (session) await session.commitTransaction()

    for (const { voucherId, discountAmount } of voucherDiscounts) {
      await incrementVoucherUsage({
        voucherId,
        userId: input.userId,
        orderId: order._id.toString(),
        guestEmail: input.guestEmail,
        discountAmount,
        session: undefined,
      })
    }

    logger.info({ orderId: order._id }, 'order created')

    return { ok: true, order: order as IOrder, created: true }
  } catch (err) {
    if (session) await session.abortTransaction().catch(() => {})

    for (const item of decInputs) {
      await restoreStock(item).catch(() => {})
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
  const order = await Order.findOne({
    _id: orderId,
    inventoryReleased: false,
  })

  if (!order) return

  const updated = await Order.updateOne(
    { _id: orderId, inventoryReleased: false },
    { $set: { inventoryReleased: true } }
  )

  if (updated.modifiedCount !== 1) return

  for (const item of order.items) {
    await restoreStock({
      productId: item.productId,
      variantSku: item.variantSku,
      quantity: item.quantity,
    }).catch(err => {
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

function round2(n: number) {
  return Math.round(n * 100) / 100
}