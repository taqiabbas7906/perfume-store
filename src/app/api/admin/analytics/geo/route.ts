import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import { REVENUE_STATUSES } from '@/lib/constants'
import { getPeriodRange } from '@/lib/utils/period'

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/analytics/geo
 * Query: ?period=30d
 * Returns orders + revenue grouped by shipping country
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const { now, start, period } = getPeriodRange(req.nextUrl.searchParams.get('period'))

    const countries = await Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: start, $lte: now } } },
      {
        $group: {
          _id:     '$shippingAddress.country',
          orders:  { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      {
        $project: {
          _id:     0,
          country: '$_id',
          orders:  1,
          revenue: { $round: ['$revenue', 2] },
        },
      },
      { $sort: { orders: -1 } },
      { $limit: 50 },
    ])

    return NextResponse.json({ success: true, period, countries })
  } catch (err) {
    logRouteError('GET /api/admin/analytics/geo', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
