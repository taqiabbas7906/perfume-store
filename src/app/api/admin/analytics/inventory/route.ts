import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Product from '@/models/Product'

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/analytics/inventory
 * Returns out-of-stock and low-stock product summaries
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const [summary, outOfStock, lowStock] = await Promise.all([
      Product.aggregate([
        { $match: { active: true } },
        { $unwind: '$variants' },
        {
          $group: {
            _id:           null,
            totalProducts: { $addToSet: '$_id' },
            totalVariants: { $sum: 1 },
            totalStock:    { $sum: '$variants.quantity' },
          },
        },
        {
          $project: {
            _id:           0,
            totalProducts: { $size: '$totalProducts' },
            totalVariants: 1,
            totalStock:    1,
          },
        },
      ]),

      // Out of stock: active products where ALL variants have quantity = 0
      Product.aggregate([
        { $match: { active: true, totalStock: 0 } },
        {
          $project: {
            _id:      1,
            name:     1,
            slug:     1,
            minPrice: 1,
            image:    { $arrayElemAt: ['$images.url', 0] },
          },
        },
        { $sort: { name: 1 } },
        { $limit: 20 },
      ]),

      // Low stock: active products where at least one variant is low (qty <= threshold, qty > 0)
      Product.aggregate([
        { $match: { active: true, totalStock: { $gt: 0 } } },
        { $unwind: '$variants' },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ['$variants.quantity', 0] },
                { $lte: ['$variants.quantity', '$variants.lowStockThreshold'] },
              ],
            },
          },
        },
        {
          $group: {
            _id:          '$_id',
            name:         { $first: '$name' },
            slug:         { $first: '$slug' },
            minPrice:     { $first: '$minPrice' },
            image:        { $first: { $arrayElemAt: ['$images.url', 0] } },
            lowVariants:  { $sum: 1 },
            lowestStock:  { $min: '$variants.quantity' },
          },
        },
        { $sort: { lowestStock: 1 } },
        { $limit: 20 },
      ]),
    ])

    return NextResponse.json({
      success: true,
      summary: summary[0] ?? { totalProducts: 0, totalVariants: 0, totalStock: 0 },
      outOfStock,
      lowStock,
    })
  } catch (err) {
    logRouteError('GET /api/admin/analytics/inventory', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
