import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Product from '@/models/Product'
import InventoryLog from '@/models/InventoryLog'

/**
 * GET /api/admin/inventory
 * Returns:
 *   - out_of_stock: variants with quantity === 0
 *   - low_stock:    variants with 0 < quantity <= lowStockThreshold
 *   - expiring_soon: variants with expiresAt within 30 days
 *   - recent_logs:  last 50 inventory events across all products
 *
 * Query params:
 *   filter=all|out_of_stock|low_stock|expiring
 *   page, limit
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') ?? 'all'

    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const [variantRows, totalActiveProducts, recentLogs] = await Promise.all([
      Product.aggregate([
        { $match: { active: true } },
        { $project: { name: 1, slug: 1, brand: 1, variants: 1 } },
        { $unwind: '$variants' },
        {
          $match: {
            $or: [
              { 'variants.quantity': 0 },
              { $expr: { $lte: ['$variants.quantity', { $ifNull: ['$variants.lowStockThreshold', 5] }] } },
              { 'variants.expiresAt': { $lte: thirtyDays } },
            ],
          },
        },
        {
          $project: {
            productId:    '$_id',
            productName:  '$name',
            productSlug:  '$slug',
            brand:        1,
            variantSku:   '$variants.sku',
            variantLabel: '$variants.label',
            quantity:     '$variants.quantity',
            threshold:    { $ifNull: ['$variants.lowStockThreshold', 5] },
            expiresAt:    '$variants.expiresAt',
          },
        },
      ]),
      Product.countDocuments({ active: true }),
      InventoryLog.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('adminId', 'name email')
        .populate('orderId', '_id')
        .lean(),
    ])

    const outOfStock:   any[] = []
    const lowStock:     any[] = []
    const expiringSoon: any[] = []

    for (const r of variantRows as any[]) {
      if (r.quantity === 0) outOfStock.push({ ...r, status: 'out_of_stock' })
      else if (r.quantity <= r.threshold) lowStock.push({ ...r, status: 'low_stock' })
      if (r.expiresAt && new Date(r.expiresAt) <= thirtyDays) {
        expiringSoon.push({ ...r, status: 'expiring_soon', daysLeft: Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / 86400000) })
      }
    }

    lowStock.sort((a, b) => a.quantity - b.quantity)
    expiringSoon.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())

    const summary = {
      outOfStockCount:   outOfStock.length,
      lowStockCount:     lowStock.length,
      expiringSoonCount: expiringSoon.length,
      totalActiveProducts,
    }

    let items: any[]
    switch (filter) {
      case 'out_of_stock':  items = outOfStock;   break
      case 'low_stock':     items = lowStock;      break
      case 'expiring':      items = expiringSoon;  break
      default:              items = [...outOfStock, ...lowStock]
    }

    return NextResponse.json({
      success: true,
      summary,
      items,
      recentLogs: filter === 'all' ? recentLogs : undefined,
    })
  } catch (err) {
    logRouteError('GET /api/admin/inventory', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
