import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import User from '@/models/User'

const REVENUE_STATUSES = ['paid', 'shipped', 'delivered']

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/analytics/customers
 * Query: ?period=30d
 * Returns new vs returning customers + top LTV customers
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const period = req.nextUrl.searchParams.get('period') ?? '30d'

    const now   = new Date()
    const start = new Date()
    if (period === 'today')      start.setHours(0, 0, 0, 0)
    else if (period === '7d')    start.setDate(now.getDate() - 7)
    else if (period === '90d')   start.setDate(now.getDate() - 90)
    else if (period === '1y')    start.setFullYear(now.getFullYear() - 1)
    else                         start.setDate(now.getDate() - 30)

    const [newUsers, totalUsers, returningAgg, topLTV] = await Promise.all([
      // New registrations in period
      User.countDocuments({ createdAt: { $gte: start, $lte: now }, role: 'user' }),

      // Total users ever
      User.countDocuments({ role: 'user' }),

      // Returning customers: users with >1 paid order ever
      Order.aggregate([
        { $match: { status: { $in: REVENUE_STATUSES }, user: { $exists: true } } },
        { $group: { _id: '$user', orderCount: { $sum: 1 } } },
        { $match: { orderCount: { $gt: 1 } } },
        { $count: 'count' },
      ]),

      // Top 10 customers by lifetime value
      Order.aggregate([
        { $match: { status: { $in: REVENUE_STATUSES }, user: { $exists: true } } },
        {
          $group: {
            _id:        '$user',
            ltv:        { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            lastOrder:  { $max: '$createdAt' },
          },
        },
        { $sort: { ltv: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from:         'users',
            localField:   '_id',
            foreignField: '_id',
            as:           'userInfo',
            pipeline:     [{ $project: { name: 1, email: 1 } }],
          },
        },
        {
          $project: {
            _id:        1,
            ltv:        { $round: ['$ltv', 2] },
            orderCount: 1,
            lastOrder:  1,
            name:       { $arrayElemAt: ['$userInfo.name', 0] },
            email:      { $arrayElemAt: ['$userInfo.email', 0] },
          },
        },
      ]),
    ])

    const returning = returningAgg[0]?.count ?? 0

    return NextResponse.json({
      success: true,
      period,
      newUsers,
      totalUsers,
      returningCustomers: returning,
      topLTV,
    })
  } catch (err) {
    logRouteError('GET /api/admin/analytics/customers', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
