import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthUser } from '@/lib/getAuthUser'
import { ordersRateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import Review from '@/models/Review'
import Voucher from '@/models/Voucher'
import VoucherUsage from '@/models/VoucherUsage'

type VoucherFilter = Record<string, unknown> & {
  firstOrderOnly?: { $ne: boolean }
}

interface VoucherFacet {
  total: Array<{ count: number }>
  vouchers: Array<{
    _id: unknown
    code: string
    type: string
    value: number
    minOrderAmount: number
    maxDiscountAmount?: number
    expiresAt?: Date
    startsAt?: Date
  }>
}

export async function GET(req: NextRequest) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const user = await getAuthUser(req)
    if (!user) return apiError(401, { error: 'Unauthorized' })

    const now = new Date()
    const [orderSummary] = await Order.aggregate<{
      _id: null
      orderCount: number
      orderTotal: number
    }>([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          orderTotal: { $sum: '$totalAmount' },
        },
      },
    ])

    const orderCount = orderSummary?.orderCount ?? 0
    const voucherFilter: VoucherFilter = {
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
        {
          $or: [
            { customerIds: { $exists: false } },
            { customerIds: { $size: 0 } },
            { customerIds: user._id },
          ],
        },
      ],
    }

    if (orderCount > 0) {
      voucherFilter.firstOrderOnly = { $ne: true }
    }

    const [recentOrders, reviewCount, voucherFacets] = await Promise.all([
      Order.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id status totalAmount items createdAt')
        .lean(),
      Review.countDocuments({ user: user._id }),
      Voucher.aggregate<VoucherFacet>([
        { $match: voucherFilter },
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
        { $sort: { updatedAt: -1, createdAt: -1 } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            vouchers: [
              { $limit: 6 },
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
            ],
          },
        },
      ]),
    ])
    const voucherFacet = voucherFacets[0]

    return NextResponse.json({
      success: true,
      totals: {
        orderCount,
        orderTotal: orderSummary?.orderTotal ?? 0,
        reviewCount,
        voucherCount: voucherFacet?.total[0]?.count ?? 0,
      },
      recentOrders,
      featuredVouchers: voucherFacet?.vouchers ?? [],
    })
  } catch (err) {
    logRouteError('GET /api/account/overview', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
