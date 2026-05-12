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

    // Aggregate all products with at least one concerning variant
    const allProducts = await Product.find({ active: true })
      .select('name slug brand variants totalStock')
      .lean() as any[]

    const outOfStock:   any[] = []
    const lowStock:     any[] = []
    const expiringSoon: any[] = []
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    for (const product of allProducts) {
      if (!product.variants?.length) continue

      for (const variant of product.variants) {
        const threshold = variant.lowStockThreshold ?? 5
        const base = {
          productId:    product._id,
          productName:  product.name,
          productSlug:  product.slug,
          brand:        product.brand,
          variantSku:   variant.sku,
          variantLabel: variant.label,
          quantity:     variant.quantity,
          threshold,
          expiresAt:    variant.expiresAt,
        }

        if (variant.quantity === 0) {
          outOfStock.push({ ...base, status: 'out_of_stock' })
        } else if (variant.quantity <= threshold) {
          lowStock.push({ ...base, status: 'low_stock' })
        }

        if (variant.expiresAt && new Date(variant.expiresAt) <= thirtyDays) {
          expiringSoon.push({ ...base, status: 'expiring_soon', daysLeft: Math.ceil((new Date(variant.expiresAt).getTime() - Date.now()) / 86400000) })
        }
      }
    }

    // Sort: out_of_stock first, then by quantity asc
    lowStock.sort((a, b) => a.quantity - b.quantity)
    expiringSoon.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())

    const recentLogs = await InventoryLog.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('adminId', 'name email')
      .populate('orderId', '_id')
      .lean()

    const summary = {
      outOfStockCount:   outOfStock.length,
      lowStockCount:     lowStock.length,
      expiringSoonCount: expiringSoon.length,
      totalActiveProducts: allProducts.length,
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
