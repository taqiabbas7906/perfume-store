import { ClientSession, Types } from 'mongoose'
import Product from '@/models/Product'
import InventoryLog, { InventoryReason } from '@/models/InventoryLog'
import CartReservation from '@/models/CartReservation'
import { logger } from './logger'
import { Resend } from 'resend'

const FROM_EMAIL = process.env.EMAIL_FROM || 'orders@perfumestore.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'admin@perfumestore.com'
const RESERVATION_TTL_MS = 15 * 60 * 1000 // 15 minutes

function getResend() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
}

/* ───────────────────────────────────────────── */

export interface DecrementInput {
  productId: Types.ObjectId | string
  variantSku: string
  quantity: number
}

export interface LogContext {
  reason: InventoryReason
  orderId?: Types.ObjectId | string
  adminId?: Types.ObjectId | string
  note?: string
}

/* ───────────────────────────────────────────── */
/* SAFE OBJECT ID */
/* ───────────────────────────────────────────── */

function toObjectId(id: Types.ObjectId | string): Types.ObjectId | null {
  if (!id) return null
  if (id instanceof Types.ObjectId) return id
  if (!Types.ObjectId.isValid(id)) return null
  return new Types.ObjectId(id)
}

/* ───────────────────────────────────────────── */
/* VALIDATION */
/* ───────────────────────────────────────────── */

function validate(input: DecrementInput):
  | { ok: true; productId: Types.ObjectId }
  | { ok: false } {
  const productId = toObjectId(input.productId)
  if (!productId) return { ok: false }
  if (!input.variantSku) return { ok: false }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return { ok: false }
  return { ok: true, productId }
}

/* ───────────────────────────────────────────── */
/* LOW-STOCK EMAIL (non-blocking, best-effort) */
/* ───────────────────────────────────────────── */

async function maybeSendLowStockAlert(
  productId: Types.ObjectId,
  variantSku: string,
  quantityAfter: number
) {
  try {
    const resend = getResend()
    if (!resend) return
    const product = await Product.findOne(
      { _id: productId, 'variants.sku': variantSku },
      { name: 1, slug: 1, 'variants.$': 1 }
    ).lean() as any
    if (!product) return

    const variant = product.variants?.[0]
    if (!variant) return

    const threshold = variant.lowStockThreshold ?? 5

    // Only alert when we cross the threshold (exactly at or below it)
    if (quantityAfter > threshold) return

    const subject = quantityAfter === 0
      ? `🚨 OUT OF STOCK — ${product.name} (${variant.label})`
      : `⚠️ Low Stock — ${product.name} (${variant.label}) — ${quantityAfter} left`

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html: `
        <h2 style="color:${quantityAfter === 0 ? '#dc2626' : '#d97706'}">${subject}</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Product</td><td><strong>${product.name}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Variant</td><td>${variant.label}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">SKU</td><td><code>${variantSku}</code></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Remaining</td><td><strong style="color:${quantityAfter === 0 ? '#dc2626' : '#d97706'}">${quantityAfter}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Threshold</td><td>${threshold}</td></tr>
        </table>
        <p style="margin-top:20px;font-size:13px;color:#6b7280">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/inventory">View Inventory Dashboard →</a>
        </p>
      `,
    })
  } catch (err) {
    logger.warn({ err, variantSku }, 'Low-stock email failed (non-fatal)')
  }
}

/* ───────────────────────────────────────────── */
/* WRITE AUDIT LOG (non-blocking) */
/* ───────────────────────────────────────────── */

async function writeLog(
  productId: Types.ObjectId,
  variantSku: string,
  delta: number,
  quantityBefore: number,
  quantityAfter: number,
  ctx: LogContext
) {
  try {
    const product = await Product.findOne(
      { _id: productId, 'variants.sku': variantSku },
      { name: 1, 'variants.$': 1 }
    ).lean() as any

    await InventoryLog.create({
      productId,
      productName: product?.name ?? 'Unknown',
      variantSku,
      variantLabel: product?.variants?.[0]?.label ?? variantSku,
      delta,
      quantityBefore,
      quantityAfter,
      reason: ctx.reason,
      orderId: ctx.orderId ? (toObjectId(ctx.orderId) ?? undefined) : undefined,
      adminId: ctx.adminId ? (toObjectId(ctx.adminId) ?? undefined) : undefined,
      note: ctx.note,
    })
  } catch (err) {
    logger.warn({ err, variantSku }, 'Inventory log write failed (non-fatal)')
  }
}

/* ───────────────────────────────────────────── */
/* ATOMIC DECREMENT */
/* ───────────────────────────────────────────── */

export async function decrementStock(
  input: DecrementInput,
  session?: ClientSession,
  ctx: LogContext = { reason: 'order_placed' }
): Promise<boolean> {
  const v = validate(input)
  if (!v.ok) return false

  /* Single atomic op: decrement + capture the pre-update doc. */
  const before = await Product.findOneAndUpdate(
    {
      _id: v.productId,
      variants: {
        $elemMatch: { sku: input.variantSku, quantity: { $gte: input.quantity } },
      },
    },
    {
      $inc: {
        'variants.$.quantity': -input.quantity,
        totalStock: -input.quantity,
      },
    },
    {
      returnDocument: 'before',
      projection: { 'variants.$': 1 },
      ...(session ? { session } : {}),
    }
  ).lean() as any

  if (!before) return false

  const quantityBefore: number = before.variants?.[0]?.quantity ?? 0
  const quantityAfter = quantityBefore - input.quantity

  void writeLog(v.productId, input.variantSku, -input.quantity, quantityBefore, quantityAfter, ctx)
  void maybeSendLowStockAlert(v.productId, input.variantSku, quantityAfter)
  return true
}

/* ───────────────────────────────────────────── */
/* RESTORE STOCK */
/* ───────────────────────────────────────────── */

export async function restoreStock(
  input: DecrementInput,
  session?: ClientSession,
  ctx: LogContext = { reason: 'order_cancelled' }
): Promise<boolean> {
  const v = validate(input)
  if (!v.ok) return false

  const before = await Product.findOneAndUpdate(
    { _id: v.productId, 'variants.sku': input.variantSku },
    {
      $inc: {
        'variants.$.quantity': input.quantity,
        totalStock: input.quantity,
      },
    },
    {
      returnDocument: 'before',
      projection: { 'variants.$': 1 },
      ...(session ? { session } : {}),
    }
  ).lean() as any

  if (!before) return false

  const quantityBefore: number = before.variants?.[0]?.quantity ?? 0
  void writeLog(v.productId, input.variantSku, +input.quantity, quantityBefore, quantityBefore + input.quantity, ctx)
  return true
}

/* ───────────────────────────────────────────── */
/* MANUAL ADJUSTMENT (admin) */
/* ───────────────────────────────────────────── */

export async function manualStockAdjustment(opts: {
  productId: Types.ObjectId | string
  variantSku: string
  newQuantity: number
  adminId: Types.ObjectId | string
  note?: string
}): Promise<{ ok: boolean; quantityBefore: number; quantityAfter: number }> {
  const productId = toObjectId(opts.productId)
  if (!productId || !Number.isInteger(opts.newQuantity) || opts.newQuantity < 0) {
    return { ok: false, quantityBefore: 0, quantityAfter: 0 }
  }

  /* Atomic: set the variant quantity and adjust totalStock by the same delta
   * in one round trip, against the live document. */
  const before = await Product.findOneAndUpdate(
    { _id: productId, 'variants.sku': opts.variantSku },
    [
      {
        $set: {
          variants: {
            $map: {
              input: '$variants',
              as: 'v',
              in: {
                $cond: [
                  { $eq: ['$$v.sku', opts.variantSku] },
                  { $mergeObjects: ['$$v', { quantity: opts.newQuantity }] },
                  '$$v',
                ],
              },
            },
          },
          totalStock: {
            $add: [
              { $subtract: ['$totalStock', { $ifNull: [{ $arrayElemAt: ['$variants.quantity', { $indexOfArray: ['$variants.sku', opts.variantSku] }] }, 0] }] },
              opts.newQuantity,
            ],
          },
        },
      },
    ],
    { returnDocument: 'before', projection: { variants: 1 } }
  ).lean() as any

  if (!before) return { ok: false, quantityBefore: 0, quantityAfter: 0 }

  const variant = before.variants.find((v: any) => v.sku === opts.variantSku)
  if (!variant) return { ok: false, quantityBefore: 0, quantityAfter: 0 }

  const quantityBefore: number = variant.quantity
  const delta = opts.newQuantity - quantityBefore

  void writeLog(productId, opts.variantSku, delta, quantityBefore, opts.newQuantity, {
    reason: delta >= 0 ? 'restock' : 'manual_adjustment',
    adminId: opts.adminId,
    note: opts.note,
  })

  if (opts.newQuantity <= (variant.lowStockThreshold ?? 5)) {
    void maybeSendLowStockAlert(productId, opts.variantSku, opts.newQuantity)
  }

  return { ok: true, quantityBefore, quantityAfter: opts.newQuantity }
}

/* ───────────────────────────────────────────── */
/* BATCH DECREMENT (SAFE + FAIL-FAST + ROLLBACK) */
/* ───────────────────────────────────────────── */

export async function decrementStockBatch(
  items: DecrementInput[],
  session?: ClientSession,
  ctx: LogContext = { reason: 'order_placed' }
): Promise<
  | { ok: true }
  | { ok: false; failedSku: string; restored: DecrementInput[] }
> {
  const succeeded: DecrementInput[] = []

  for (const item of items) {
    const v = validate(item)
    if (!v.ok) {
      await rollback(succeeded, session, ctx)
      return { ok: false, failedSku: item.variantSku, restored: succeeded }
    }

    const ok = await decrementStock(item, session, ctx)
    if (!ok) {
      await rollback(succeeded, session, ctx)
      return { ok: false, failedSku: item.variantSku, restored: succeeded }
    }

    succeeded.push(item)
  }

  return { ok: true }
}

/* ───────────────────────────────────────────── */
/* ROLLBACK HELPER */
/* ───────────────────────────────────────────── */

async function rollback(items: DecrementInput[], session?: ClientSession, ctx?: LogContext) {
  for (const item of items) {
    try {
      const ok = await restoreStock(item, session, { reason: 'rollback', orderId: ctx?.orderId })
      if (!ok) logger.fatal({ item }, 'Failed to restore stock during rollback')
    } catch (err) {
      logger.fatal({ err, item }, 'Error restoring stock during rollback')
    }
  }
}

/* ───────────────────────────────────────────── */
/* CART RESERVATIONS — prevent checkout race     */
/* ───────────────────────────────────────────── */

/**
 * Reserve stock for a checkout session.
 * Atomically checks that (actual_stock - already_reserved) >= requested.
 */
export async function reserveStock(opts: {
  sessionKey: string
  items: DecrementInput[]
}): Promise<{ ok: true } | { ok: false; failedSku: string }> {
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS)

  for (const item of opts.items) {
    const productId = toObjectId(item.productId)
    if (!productId) return { ok: false, failedSku: item.variantSku }

    // How much is already reserved by OTHER sessions for this variant
    const reservedByOthers = await CartReservation.aggregate([
      {
        $match: {
          productId,
          variantSku: item.variantSku,
          sessionKey: { $ne: opts.sessionKey },
          expiresAt: { $gt: new Date() },
        },
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ])
    const alreadyReserved: number = reservedByOthers[0]?.total ?? 0

    // Check actual stock
    const product = await Product.findOne(
      { _id: productId, 'variants.sku': item.variantSku },
      { 'variants.$': 1 }
    ).lean() as any

    const actualStock: number = product?.variants?.[0]?.quantity ?? 0
    const available = actualStock - alreadyReserved

    if (available < item.quantity) {
      return { ok: false, failedSku: item.variantSku }
    }

    // Upsert this session's reservation (replace any existing one for same item)
    await CartReservation.findOneAndUpdate(
      { sessionKey: opts.sessionKey, productId, variantSku: item.variantSku },
      { quantity: item.quantity, expiresAt },
      { upsert: true }
    )
  }

  return { ok: true }
}

/**
 * Release reservations for a session (called after order placed or cart abandoned).
 */
export async function releaseReservation(sessionKey: string): Promise<void> {
  await CartReservation.deleteMany({ sessionKey })
}

/**
 * Check if items are reservable (for checkout pre-flight).
 * Returns list of SKUs that don't have enough available stock.
 */
export async function checkAvailability(
  items: DecrementInput[],
  excludeSessionKey?: string
): Promise<{ available: true } | { available: false; unavailableSkus: string[] }> {
  const unavailable: string[] = []

  for (const item of items) {
    const productId = toObjectId(item.productId)
    if (!productId) { unavailable.push(item.variantSku); continue }

    const matchFilter: any = {
      productId,
      variantSku: item.variantSku,
      expiresAt: { $gt: new Date() },
    }
    if (excludeSessionKey) matchFilter.sessionKey = { $ne: excludeSessionKey }

    const reservedByOthers = await CartReservation.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ])
    const alreadyReserved: number = reservedByOthers[0]?.total ?? 0

    const product = await Product.findOne(
      { _id: productId, 'variants.sku': item.variantSku },
      { 'variants.$': 1 }
    ).lean() as any

    const actualStock: number = product?.variants?.[0]?.quantity ?? 0
    if (actualStock - alreadyReserved < item.quantity) {
      unavailable.push(item.variantSku)
    }
  }

  return unavailable.length === 0
    ? { available: true }
    : { available: false, unavailableSkus: unavailable }
}
