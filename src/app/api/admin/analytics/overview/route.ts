import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import User from '@/models/User'

const REVENUE_STATUSES = ['paid', 'shipped', 'delivered']

function periodDates(p: string) {
  const now = new Date()
  const start = new Date()
  if (p === 'today')   start.setHours(0, 0, 0, 0)
  else if (p === '7d') start.setDate(now.getDate() - 7)
  else if (p === '90d') start.setDate(now.getDate() - 90)
  else                  start.setDate(now.getDate() - 30)
  const span     = now.getTime() - start.getTime()
  const prevEnd  = new Date(start)
  const prevStart = new Date(start.getTime() - span)
  return { now, start, prevStart, prevEnd }
}

function pct(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/analytics/overview
 * Query: ?period=30d  (today|7d|30d|90d)
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const period = req.nextUrl.searchParams.get('period') ?? '30d'
    const { now, start, prevStart, prevEnd } = periodDates(period)

    const [currRevAgg, prevRevAgg, currOrderAgg, prevOrderAgg, currUsers, prevUsers, statusAgg] =
      await Promise.all([
        // Current period revenue
        Order.aggregate([
          { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: start, $lte: now } } },
          { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
        ]),
        // Prev period revenue
        Order.aggregate([
          { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: prevStart, $lt: prevEnd } } },
          { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
        ]),
        // Current period all orders count
        Order.countDocuments({ createdAt: { $gte: start, $lte: now } }),
        // Prev period all orders count
        Order.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
        // New users in current period
        User.countDocuments({ createdAt: { $gte: start, $lte: now }, role: 'user' }),
        // New users in prev period
        User.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd }, role: 'user' }),
        // Orders by status in current period
        Order.aggregate([
          { $match: { createdAt: { $gte: start, $lte: now } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ])

    const currRev    = currRevAgg[0]?.revenue ?? 0
    const prevRev    = prevRevAgg[0]?.revenue ?? 0
    const currOrders = currRevAgg[0]?.orders  ?? 0
    const prevOrders = prevRevAgg[0]?.orders  ?? 0

    const byStatus: Record<string, number> = {}
    for (const s of statusAgg) byStatus[s._id] = s.count

    return NextResponse.json({
      success: true,
      period,
      revenue: {
        current:  Math.round(currRev * 100) / 100,
        previous: Math.round(prevRev * 100) / 100,
        change:   pct(currRev, prevRev),
      },
      orders: {
        current:  currOrderAgg,
        previous: prevOrderAgg,
        change:   pct(currOrderAgg, prevOrderAgg),
        byStatus,
      },
      aov: {
        current:  currOrders > 0 ? Math.round((currRev / currOrders) * 100) / 100 : 0,
        previous: prevOrders > 0 ? Math.round((prevRev / prevOrders) * 100) / 100 : 0,
        change:   pct(
          currOrders > 0 ? currRev / currOrders : 0,
          prevOrders > 0 ? prevRev / prevOrders : 0,
        ),
      },
      newUsers: {
        current:  currUsers,
        previous: prevUsers,
        change:   pct(currUsers, prevUsers),
      },
    })
  } catch (err) {
    logRouteError('GET /api/admin/analytics/overview', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
