import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import { REVENUE_STATUSES } from '@/lib/constants'
import { getPeriodRange } from '@/lib/utils/period'

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/analytics/top-products
 * Query: ?period=30d&limit=10&sort=revenue  (sort: revenue|units)
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const sp     = req.nextUrl.searchParams
    const limit  = Math.min(parseInt(sp.get('limit') ?? '10'), 50)
    const sort   = sp.get('sort') === 'units' ? 'units' : 'revenue'
    const { now, start, period } = getPeriodRange(sp.get('period'))

    const products = await Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: start, $lte: now } } },
      { $unwind: '$items' },
      {
        $group: {
          _id:        '$items.productId',
          name:       { $first: '$items.name' },
          units:      { $sum: '$items.quantity' },
          revenue:    { $sum: '$items.subtotal' },
          orderCount: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id:        1,
          name:       1,
          units:      1,
          revenue:    { $round: ['$revenue', 2] },
          orderCount: { $size: '$orderCount' },
        },
      },
      { $sort: { [sort]: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from:         'products',
          localField:   '_id',
          foreignField: '_id',
          as:           'product',
          pipeline:     [{ $project: { slug: 1, images: { $slice: ['$images', 1] } } }],
        },
      },
      {
        $project: {
          _id:        1,
          name:       1,
          units:      1,
          revenue:    1,
          orderCount: 1,
          slug:       { $arrayElemAt: ['$product.slug', 0] },
          image:      { $arrayElemAt: [{ $arrayElemAt: ['$product.images.url', 0] }, 0] },
        },
      },
    ])

    return NextResponse.json({ success: true, period, sort, products })
  } catch (err) {
    logRouteError('GET /api/admin/analytics/top-products', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
