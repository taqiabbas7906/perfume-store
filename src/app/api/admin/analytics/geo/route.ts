import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'

const REVENUE_STATUSES = ['paid', 'shipped', 'delivered']

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

    const period = req.nextUrl.searchParams.get('period') ?? '30d'

    const now   = new Date()
    const start = new Date()
    if (period === 'today')      start.setHours(0, 0, 0, 0)
    else if (period === '7d')    start.setDate(now.getDate() - 7)
    else if (period === '90d')   start.setDate(now.getDate() - 90)
    else if (period === '1y')    start.setFullYear(now.getFullYear() - 1)
    else                         start.setDate(now.getDate() - 30)

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
