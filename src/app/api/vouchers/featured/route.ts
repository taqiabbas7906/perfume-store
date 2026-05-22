import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import { getAuthUser } from '@/lib/getAuthUser'
import Voucher from '@/models/Voucher'
import VoucherUsage from '@/models/VoucherUsage'
import Order from '@/models/Order'

/**
 * Public endpoint — returns the single "best" featured voucher to show on
 * the homepage hero card. Mirrors the eligibility logic in
 * /api/account/overview so the hero card disappears for a logged-in user
 * once they've hit perUserLimit, the voucher is exhausted, or it expires.
 *
 * Guests don't have a stable identity at fetch time, so the per-user-limit
 * check is skipped for them — checkout's validateVoucher() still enforces
 * the limit via email/IP, so they'll be blocked there if they're abusing
 * the code.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface FeaturedVoucherDTO {
  _id: string
  code: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
  minOrderAmount: number
  maxDiscountAmount?: number
  expiresAt?: string
  startsAt?: string
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const user = await getAuthUser(req)
    const now = new Date()

    const baseFilter: Record<string, unknown> = {
      active: true,
      featured: true,
      $and: [
        {
          $or: [
            { startsAt: { $exists: false } },
            { startsAt: null },
            { startsAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: now } },
          ],
        },
        {
          $or: [
            { usageLimit: { $exists: false } },
            { usageLimit: null },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
          ],
        },
      ],
    }

    if (user) {
      // Restrict to vouchers that the user is allowed to use.
      ;(baseFilter.$and as unknown[]).push({
        $or: [
          { customerIds: { $exists: false } },
          { customerIds: { $size: 0 } },
          { customerIds: user._id },
        ],
      })

      const hasOrder = await Order.exists({
        user: user._id,
        status: { $nin: ['cancelled', 'failed'] },
      })
      if (hasOrder) {
        baseFilter.firstOrderOnly = { $ne: true }
      }
    } else {
      baseFilter.firstOrderOnly = { $ne: true }
      baseFilter.$and = [
        ...(baseFilter.$and as unknown[]),
        {
          $or: [
            { customerIds: { $exists: false } },
            { customerIds: { $size: 0 } },
          ],
        },
      ]
    }

    const pipeline: Record<string, unknown>[] = [{ $match: baseFilter }]

    if (user) {
      pipeline.push(
        {
          $lookup: {
            from: VoucherUsage.collection.name,
            let: { voucherId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$voucherId', '$$voucherId'] },
                      { $eq: ['$userId', user._id] },
                    ],
                  },
                },
              },
              { $count: 'count' },
            ],
            as: 'userUsage',
          },
        },
        {
          $addFields: {
            userUsedCount: {
              $ifNull: [{ $arrayElemAt: ['$userUsage.count', 0] }, 0],
            },
          },
        },
        {
          $match: {
            $or: [
              { perUserLimit: { $exists: false } },
              { perUserLimit: null },
              { $expr: { $lt: ['$userUsedCount', '$perUserLimit'] } },
            ],
          },
        },
      )
    }

    pipeline.push(
      { $sort: { updatedAt: -1, createdAt: -1 } },
      { $limit: 1 },
      {
        $project: {
          code: 1,
          type: 1,
          value: 1,
          minOrderAmount: 1,
          maxDiscountAmount: 1,
          expiresAt: 1,
          startsAt: 1,
        },
      },
    )

    const results = await Voucher.aggregate<{
      _id: Types.ObjectId
      code: string
      type: 'percentage' | 'fixed' | 'free_shipping'
      value: number
      minOrderAmount: number
      maxDiscountAmount?: number
      expiresAt?: Date
      startsAt?: Date
    }>(pipeline)

    const top = results[0]
    if (!top) {
      return NextResponse.json({ success: true, voucher: null })
    }

    const voucher: FeaturedVoucherDTO = {
      _id: top._id.toString(),
      code: top.code,
      type: top.type,
      value: top.value,
      minOrderAmount: top.minOrderAmount,
      maxDiscountAmount: top.maxDiscountAmount,
      expiresAt: top.expiresAt?.toISOString(),
      startsAt: top.startsAt?.toISOString(),
    }

    return NextResponse.json({ success: true, voucher })
  } catch (err) {
    logRouteError('GET /api/vouchers/featured', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
