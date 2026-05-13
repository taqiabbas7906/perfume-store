import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'

const REVENUE_STATUSES = ['paid', 'shipped', 'delivered']

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/analytics/revenue
 * Query: ?period=30d&granularity=day  (period: 7d|30d|90d|1y)
 * Returns daily/weekly/monthly time-series for charting
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const period      = req.nextUrl.searchParams.get('period')      ?? '30d'
    const granularity = req.nextUrl.searchParams.get('granularity') ?? 'day'

    const now   = new Date()
    const start = new Date()
    if (period === '7d')       start.setDate(now.getDate() - 7)
    else if (period === '90d') start.setDate(now.getDate() - 90)
    else if (period === '1y')  start.setFullYear(now.getFullYear() - 1)
    else                       start.setDate(now.getDate() - 30)

    let dateFormat: string
    if (granularity === 'month')     dateFormat = '%Y-%m'
    else if (granularity === 'week') dateFormat = '%Y-W%U'
    else                             dateFormat = '%Y-%m-%d'

    const series = await Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: start, $lte: now } } },
      {
        $group: {
          _id:     { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', revenue: { $round: ['$revenue', 2] }, orders: 1 } },
    ])

    // Fill gaps with zero so the chart has a point for every day
    if (granularity === 'day') {
      const map = new Map(series.map((s) => [s.date, s]))
      const filled: { date: string; revenue: number; orders: number }[] = []
      const cur = new Date(start)
      while (cur <= now) {
        const key = cur.toISOString().slice(0, 10)
        filled.push(map.get(key) ?? { date: key, revenue: 0, orders: 0 })
        cur.setDate(cur.getDate() + 1)
      }
      return NextResponse.json({ success: true, period, granularity, series: filled })
    }

    return NextResponse.json({ success: true, period, granularity, series })
  } catch (err) {
    logRouteError('GET /api/admin/analytics/revenue', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
