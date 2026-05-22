import { Types, ClientSession } from 'mongoose'
import Voucher from '@/models/Voucher'
import VoucherUsage from '@/models/VoucherUsage'
import Order from '@/models/Order'
import type { IVoucher } from '@/types'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

/* ───────────────────────────────────────────── */
/* HELPER: ROUND TO 2 DECIMAL PLACES */
/* ───────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/* ───────────────────────────────────────────── */
/* GENERATE COUPON CODE */
/* ───────────────────────────────────────────── */

export function generateVoucherCode(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length))
  }
  return code
}

/* ───────────────────────────────────────────── */
/* VALIDATE VOUCHER */
/* ───────────────────────────────────────────── */

export interface ValidateVoucherInput {
  voucherCode: string
  cartTotal: number
  productIdsInCart?: Types.ObjectId[]
  categoryIdsInCart?: string[]
  userId?: string
  guestEmail?: string
  guestIp?: string
}

export type ValidateVoucherResult =
  | { ok: true; voucher: IVoucher; discountAmount: number }
  | {
      ok: false
      code:
        | 'INVALID_CODE'
        | 'INACTIVE'
        | 'EXPIRED'
        | 'NOT_STARTED'
        | 'USAGE_LIMIT_EXCEEDED'
        | 'MIN_ORDER_NOT_MET'
        | 'PRODUCT_RESTRICTION'
        | 'CATEGORY_RESTRICTION'
        | 'CUSTOMER_RESTRICTION'
        | 'FIRST_ORDER_ONLY'
        | 'PER_USER_LIMIT_EXCEEDED'
      message: string
    }

export async function validateVoucher(
  input: ValidateVoucherInput
): Promise<ValidateVoucherResult> {
  const { voucherCode, cartTotal, productIdsInCart, categoryIdsInCart, userId, guestEmail, guestIp } = input

  const voucher = await Voucher.findOne({
    code: voucherCode.trim().toUpperCase(),
  }).lean<IVoucher>()

  if (!voucher) {
    return { ok: false, code: 'INVALID_CODE', message: 'Invalid voucher code' }
  }

  if (!voucher.active) {
    return { ok: false, code: 'INACTIVE', message: 'Voucher is inactive' }
  }

  const now = new Date()

  if (voucher.startsAt && now < voucher.startsAt) {
    return { ok: false, code: 'NOT_STARTED', message: 'Voucher is not yet active' }
  }

  if (voucher.expiresAt && now > voucher.expiresAt) {
    return { ok: false, code: 'EXPIRED', message: 'Voucher has expired' }
  }

  if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
    return { ok: false, code: 'USAGE_LIMIT_EXCEEDED', message: 'Voucher usage limit exceeded' }
  }

  if (cartTotal < voucher.minOrderAmount) {
    return {
      ok: false,
      code: 'MIN_ORDER_NOT_MET',
      message: `Minimum order amount of ${voucher.minOrderAmount} required`,
    }
  }

  if (voucher.productIds && voucher.productIds.length > 0) {
    if (!productIdsInCart || productIdsInCart.length === 0) {
      return {
        ok: false,
        code: 'PRODUCT_RESTRICTION',
        message: 'Voucher not valid for any products in cart',
      }
    }
    const hasValidProduct = productIdsInCart.some((pid) =>
      voucher.productIds!.some((vid) => vid.toString() === pid.toString())
    )
    if (!hasValidProduct) {
      return {
        ok: false,
        code: 'PRODUCT_RESTRICTION',
        message: 'Voucher not valid for any products in cart',
      }
    }
  }

  if (voucher.categoryIds && voucher.categoryIds.length > 0) {
    if (!categoryIdsInCart || categoryIdsInCart.length === 0) {
      return {
        ok: false,
        code: 'CATEGORY_RESTRICTION',
        message: 'Voucher not valid for any categories in cart',
      }
    }
    const hasValidCategory = categoryIdsInCart.some((cid) =>
      voucher.categoryIds!.includes(cid)
    )
    if (!hasValidCategory) {
      return {
        ok: false,
        code: 'CATEGORY_RESTRICTION',
        message: 'Voucher not valid for any categories in cart',
      }
    }
  }

  if (voucher.customerIds && voucher.customerIds.length > 0) {
    if (!userId) {
      return {
        ok: false,
        code: 'CUSTOMER_RESTRICTION',
        message: 'Voucher not valid for this customer',
      }
    }
    const isAllowedCustomer = voucher.customerIds.some(
      (cid) => cid.toString() === userId
    )
    if (!isAllowedCustomer) {
      return {
        ok: false,
        code: 'CUSTOMER_RESTRICTION',
        message: 'Voucher not valid for this customer',
      }
    }
  }

  if (voucher.firstOrderOnly) {
    let hasExistingOrder = false
    if (userId) {
      hasExistingOrder = !!(await Order.exists({
        user: new Types.ObjectId(userId),
        status: { $nin: ['cancelled', 'failed'] },
      }))
    } else if (guestEmail) {
      hasExistingOrder = !!(await Order.exists({
        guestEmail: guestEmail.toLowerCase(),
        status: { $nin: ['cancelled', 'failed'] },
      }))
    }
    if (hasExistingOrder) {
      return {
        ok: false,
        code: 'FIRST_ORDER_ONLY',
        message: 'Voucher is for first orders only',
      }
    }
  }

  if (voucher.perUserLimit) {
    if (userId) {
      const usageCount = await VoucherUsage.countDocuments({
        voucherId: voucher._id,
        userId: new Types.ObjectId(userId),
      })
      if (usageCount >= voucher.perUserLimit) {
        return { ok: false, code: 'PER_USER_LIMIT_EXCEEDED', message: 'You have used this voucher too many times' }
      }
    } else {
      // Guest: enforce by email AND by IP independently
      if (guestEmail) {
        const emailCount = await VoucherUsage.countDocuments({
          voucherId: voucher._id,
          guestEmail: guestEmail.toLowerCase(),
        })
        if (emailCount >= voucher.perUserLimit) {
          return { ok: false, code: 'PER_USER_LIMIT_EXCEEDED', message: 'You have used this voucher too many times' }
        }
      }
      if (guestIp && guestIp !== 'unknown') {
        const ipCount = await VoucherUsage.countDocuments({
          voucherId: voucher._id,
          guestIp,
        })
        if (ipCount >= voucher.perUserLimit) {
          return { ok: false, code: 'PER_USER_LIMIT_EXCEEDED', message: 'This voucher has already been used from your network' }
        }
      }
    }
  }

  let discountAmount = 0

  switch (voucher.type) {
    case 'percentage':
      discountAmount = round2((cartTotal * voucher.value) / 100)
      break
    case 'fixed':
      discountAmount = voucher.value
      break
    case 'free_shipping':
      discountAmount = 0
      break
  }

  if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
    discountAmount = voucher.maxDiscountAmount
  }

  discountAmount = Math.min(discountAmount, cartTotal)

  return { ok: true, voucher, discountAmount }
}

/* ───────────────────────────────────────────── */
/* INCREMENT VOUCHER USAGE */
/* ───────────────────────────────────────────── */

export interface IncrementVoucherUsageInput {
  voucherId: Types.ObjectId | string
  userId?: string
  orderId?: string
  guestEmail?: string
  guestIp?: string
  discountAmount: number
  session?: ClientSession
}

export async function incrementVoucherUsage(
  input: IncrementVoucherUsageInput
): Promise<void> {
  const { voucherId, userId, orderId, guestEmail, guestIp, discountAmount, session } = input

  const voucherObjectId = typeof voucherId === 'string' ? new Types.ObjectId(voucherId) : voucherId

  await Voucher.updateOne(
    { _id: voucherObjectId },
    { $inc: { usedCount: 1 } },
    session ? { session } : {}
  )

  await VoucherUsage.create(
    [
      {
        voucherId: voucherObjectId,
        userId: userId ? new Types.ObjectId(userId) : undefined,
        orderId: orderId ? new Types.ObjectId(orderId) : undefined,
        guestEmail: guestEmail ? guestEmail.toLowerCase() : undefined,
        guestIp: (!userId && guestIp && guestIp !== 'unknown') ? guestIp : undefined,
        discountAmount,
        usedAt: new Date(),
      },
    ],
    session ? { session } : {}
  )

  logger.info({ voucherId, discountAmount }, 'Voucher usage incremented')
}

/* ───────────────────────────────────────────── */
/* CREATE VOUCHER */
/* ───────────────────────────────────────────── */

export interface CreateVoucherInput {
  code?: string
  type: IVoucher['type']
  value: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  perUserLimit?: number
  expiresAt?: Date
  startsAt?: Date
  active?: boolean
  featured?: boolean
  stackable?: boolean
  productIds?: string[]
  categoryIds?: string[]
  customerIds?: string[]
  firstOrderOnly?: boolean
}

export async function createVoucher(input: CreateVoucherInput): Promise<IVoucher> {
  const code = (input.code || generateVoucherCode()).trim().toUpperCase()

  const existing = await Voucher.exists({ code })
  if (existing) {
    throw new Error('Voucher code already exists')
  }

  const voucher = await Voucher.create({
    code,
    type: input.type,
    value: input.value,
    minOrderAmount: input.minOrderAmount ?? 0,
    maxDiscountAmount: input.maxDiscountAmount,
    usageLimit: input.usageLimit,
    perUserLimit: input.perUserLimit,
    expiresAt: input.expiresAt,
    startsAt: input.startsAt,
    active: input.active ?? true,
    featured: input.featured ?? false,
    stackable: input.stackable ?? false,
    productIds: input.productIds?.map((id) => new Types.ObjectId(id)),
    categoryIds: input.categoryIds,
    customerIds: input.customerIds?.map((id) => new Types.ObjectId(id)),
    firstOrderOnly: input.firstOrderOnly ?? false,
  })

  logger.info({ voucherId: voucher._id, code }, 'Voucher created')
  return voucher
}

/* ───────────────────────────────────────────── */
/* UPDATE VOUCHER */
/* ───────────────────────────────────────────── */

export interface UpdateVoucherInput {
  voucherId: string
  code?: string
  type?: IVoucher['type']
  value?: number
  minOrderAmount?: number
  maxDiscountAmount?: number | null
  usageLimit?: number | null
  perUserLimit?: number | null
  expiresAt?: Date | null
  startsAt?: Date | null
  active?: boolean
  featured?: boolean
  stackable?: boolean
  productIds?: string[]
  categoryIds?: string[]
  customerIds?: string[]
  firstOrderOnly?: boolean
}

export async function updateVoucher(input: UpdateVoucherInput): Promise<IVoucher | null> {
  const { voucherId, ...data } = input

  const updateData: Record<string, unknown> = {}
  const unsetData: Record<string, ''> = {}
  if (data.code) updateData.code = data.code.trim().toUpperCase()
  if (data.type !== undefined) updateData.type = data.type
  if (data.value !== undefined) updateData.value = data.value
  if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount
  if (data.maxDiscountAmount !== undefined) {
    if (data.maxDiscountAmount === null) unsetData.maxDiscountAmount = ''
    else updateData.maxDiscountAmount = data.maxDiscountAmount
  }
  if (data.usageLimit !== undefined) {
    if (data.usageLimit === null) unsetData.usageLimit = ''
    else updateData.usageLimit = data.usageLimit
  }
  if (data.perUserLimit !== undefined) {
    if (data.perUserLimit === null) unsetData.perUserLimit = ''
    else updateData.perUserLimit = data.perUserLimit
  }
  if (data.expiresAt !== undefined) {
    if (data.expiresAt === null) unsetData.expiresAt = ''
    else updateData.expiresAt = data.expiresAt
  }
  if (data.startsAt !== undefined) {
    if (data.startsAt === null) unsetData.startsAt = ''
    else updateData.startsAt = data.startsAt
  }
  if (data.active !== undefined) updateData.active = data.active
  if (data.featured !== undefined) updateData.featured = data.featured
  if (data.stackable !== undefined) updateData.stackable = data.stackable
  if (data.productIds) updateData.productIds = data.productIds.map((id) => new Types.ObjectId(id))
  if (data.categoryIds) updateData.categoryIds = data.categoryIds
  if (data.customerIds) updateData.customerIds = data.customerIds.map((id) => new Types.ObjectId(id))
  if (data.firstOrderOnly !== undefined) updateData.firstOrderOnly = data.firstOrderOnly

  const update: Record<string, Record<string, unknown>> = {}
  if (Object.keys(updateData).length > 0) update.$set = updateData
  if (Object.keys(unsetData).length > 0) update.$unset = unsetData

  if (Object.keys(update).length === 0) {
    return Voucher.findById(voucherId).lean<IVoucher>()
  }

  const voucher = await Voucher.findByIdAndUpdate(
    voucherId,
    update,
    { returnDocument: 'after', runValidators: true }
  ).lean<IVoucher>()

  if (voucher) {
    logger.info({ voucherId }, 'Voucher updated')
  }

  return voucher
}

/* ───────────────────────────────────────────── */
/* GET VOUCHER ANALYTICS */
/* ───────────────────────────────────────────── */

export async function getVoucherAnalytics(voucherId: string) {
  const voucher = await Voucher.findById(voucherId).lean<IVoucher>()
  if (!voucher) return null

  const usageCount = await VoucherUsage.countDocuments({ voucherId: voucher._id })
  const totalDiscount = await VoucherUsage.aggregate([
    { $match: { voucherId: voucher._id } },
    { $group: { _id: null, total: { $sum: '$discountAmount' } } },
  ])

  return {
    voucher,
    usageCount,
    totalDiscount: totalDiscount[0]?.total || 0,
  }
}

/* ───────────────────────────────────────────── */
/* GET VOUCHER USAGE HISTORY */
/* ───────────────────────────────────────────── */

export async function getVoucherUsageHistory(
  voucherId: string,
  limit: number = 50
) {
  return VoucherUsage.find({ voucherId: new Types.ObjectId(voucherId) })
    .sort({ usedAt: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .populate('orderId')
    .lean()
}
