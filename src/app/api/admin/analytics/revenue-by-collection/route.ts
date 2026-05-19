import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import { REVENUE_STATUSES } from '@/lib/constants'
import { getPeriodRange } from '@/lib/utils/period'

/**
 * GET /api/admin/analytics/revenue-by-collection
 * Query: ?period=30d&limit=4
 *
 * Returns revenue grouped by Collection over the requested period for the
 * dashboard donut chart. Orders carry productId on each line item; we look
 * each product up to find its collectionId, then aggregate $subtotal by
 * collection. Products with no collection roll into the "Uncategorized" bucket.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const sp = req.nextUrl.searchParams
    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '4', 10) || 4, 1), 20)
    const { now, start, period } = getPeriodRange(sp.get('period'))

    /**
     * Collections own a `products: [ObjectId]` array — that's how admins
     * curate them. So to attribute revenue, we look up each order item's
     * productId against `Collection.products`. If a product appears in
     * multiple collections we attribute it to the lowest-sortOrder one
     * (deterministic + matches what's surfaced first to customers).
     */
    const rows = await Order.aggregate<{
      _id: string | null
      name: string
      value: number
    }>([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: start, $lte: now } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'collections',
          let: { pid: '$items.productId' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$pid', { $ifNull: ['$products', []] }] },
              },
            },
            { $sort: { sortOrder: 1, _id: 1 } },
            { $limit: 1 },
            { $project: { _id: 1, name: 1 } },
          ],
          as: 'collection',
        },
      },
      {
        $addFields: {
          collectionDoc: { $arrayElemAt: ['$collection', 0] },
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$collectionDoc._id', null] },
          name: { $first: { $ifNull: ['$collectionDoc.name', 'Uncategorized'] } },
          value: { $sum: '$items.subtotal' },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          value: { $round: ['$value', 2] },
        },
      },
      { $sort: { value: -1 } },
    ])

    // Roll the long tail into a single "Other" slice so the donut stays readable.
    const head = rows.slice(0, limit)
    const tail = rows.slice(limit)
    const data = [...head]
    if (tail.length > 0) {
      const other = tail.reduce((sum, r) => sum + r.value, 0)
      if (other > 0) {
        data.push({ _id: 'other', name: 'Other', value: Math.round(other * 100) / 100 })
      }
    }

    return NextResponse.json({ success: true, period, data })
  } catch (err) {
    logRouteError('GET /api/admin/analytics/revenue-by-collection', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
