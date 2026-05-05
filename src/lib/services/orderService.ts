import mongoose, { Types } from 'mongoose'
import Order from '@/models/Order'
import Product from '@/models/Product'
import { getOrCreateCart, clearCart } from '@/lib/services/cartService'
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
  userId: string
  idempotencyKey: string
  shippingAddress: IShippingAddress
  voucherCode?: string
  buyNow?: BuyNowItem
  log: IOrderLog
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

const toObjectId = (id: any): Types.ObjectId | null => {
  if (!id) return null
  if (id instanceof Types.ObjectId) return id
  if (!Types.ObjectId.isValid(id)) return null
  return new Types.ObjectId(id)
}

/* ───────────────────────────────────────────── */

async function normalizeLines(
  cart: ICart | null,
  buyNow?: BuyNowItem
):
  Promise<
    | { lines: NormalizedLine[] }
    | { code: 'EMPTY_CART' | 'PRODUCT_UNAVAILABLE'; sku?: string }
  >
{
  const sourceLines = buyNow
    ? [
        {
          productId: toObjectId(buyNow.productId),
          variantSku: buyNow.variantSku,
          quantity: buyNow.quantity,
        },
      ]
    : (cart?.items ?? []).map((i: any) => ({
        productId: toObjectId(i.productId),
        variantSku: i.variantSku,
        quantity: i.quantity,
      }))

  if (!sourceLines.length) return { code: 'EMPTY_CART' }

  const validLines = sourceLines.filter(
    (l): l is { productId: Types.ObjectId; variantSku: string; quantity: number } =>
      !!l.productId
  )

  const productIds = [
    ...new Set(validLines.map(l => l.productId.toString())),
  ].map(id => new Types.ObjectId(id))

  const products = await Product.find({
    _id: { $in: productIds },
    active: true,
  }).lean<IProduct[]>()

  const byId = new Map(products.map(p => [p._id.toString(), p]))

  const lines: NormalizedLine[] = []

  for (const l of validLines) {
    const p = byId.get(l.productId.toString())
    if (!p) return { code: 'PRODUCT_UNAVAILABLE', sku: l.variantSku }

    const variant = p.variants.find(v => v.sku === l.variantSku)
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

  const userId = toObjectId(input.userId)
  if (!userId) {
    return {
      ok: false,
      code: 'INTERNAL',
      message: 'Invalid userId',
    }
  }

  const existing = await Order.findOne({
    idempotencyKey: input.idempotencyKey,
    user: userId,
  }).lean<IOrder>()

  if (existing) {
    return { ok: true, order: existing, created: false }
  }

  const cart = input.buyNow
    ? null
    : await getOrCreateCart({ userId: input.userId })

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

  const decInputs: DecrementInput[] = lines.map(l => ({
    productId: l.productId,
    variantSku: l.variantSku,
    quantity: l.quantity,
  }))

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

    const subtotal = round2(
      lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
    )

    const orderPayload = {
      user: userId,

      items: lines.map(l => ({
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
      discount: 0,
      shipping: 0,
      tax: 0,
      totalAmount: subtotal,
      currency: 'USD',

      idempotencyKey: input.idempotencyKey,
      paymentIntentId: '',
      inventoryReleased: false,
      orderLog: input.log,
    }

    const [order] = await Order.insertMany([orderPayload], {
      session: session ?? undefined,
    })

    if (!input.buyNow) {
      await clearCart({ userId: input.userId })
    }

    if (session) await session.commitTransaction()

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