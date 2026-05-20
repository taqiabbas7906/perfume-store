import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import { REVENUE_STATUSES } from '@/lib/constants'
import Order from '@/models/Order'
import Product from '@/models/Product'

const PUBLIC_FIELDS = '-__v -variants.options._raw'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()

    const limit = Math.min(
      12,
      Math.max(1, Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '6', 10)),
    )

    const products = await Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          unitsSold: { $sum: '$items.quantity' },
          lastSoldAt: { $max: '$createdAt' },
        },
      },
      { $sort: { unitsSold: -1, lastSoldAt: -1 } },
      { $limit: limit * 2 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.active': true } },
      { $limit: limit },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$product', { unitsSold: '$unitsSold' }],
          },
        },
      },
      {
        $project: {
          __v: 0,
          'variants.options._raw': 0,
        },
      },
    ])

    if (products.length > 0) {
      return NextResponse.json({ success: true, products })
    }

    const fallback = await Product.find({ active: true })
      .sort({ ratingCount: -1, ratingAverage: -1, _id: -1 })
      .limit(limit)
      .select(PUBLIC_FIELDS)
      .lean()

    return NextResponse.json({ success: true, products: fallback })
  } catch (err) {
    logRouteError('GET /api/products/top-selling', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
