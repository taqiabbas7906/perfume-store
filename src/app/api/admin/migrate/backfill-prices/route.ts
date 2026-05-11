import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Product from '@/models/Product'

/**
 * POST /api/admin/migrate/backfill-prices
 * Recalculates minPrice, maxPrice, totalStock for every product
 * that has variants but is missing these computed fields.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    // Find all products (not just broken ones — safe to recompute all)
    const products = await Product.find({}).select('variants minPrice maxPrice totalStock')

    let updated = 0
    for (const p of products) {
      if (!p.variants?.length) continue

      const prices = p.variants.map((v: any) => v.discountedPrice ?? v.originalPrice ?? 0)
      const minPrice  = Math.min(...prices)
      const maxPrice  = Math.max(...prices)
      const totalStock = p.variants.reduce((s: number, v: any) => s + (v.quantity ?? 0), 0)

      const needsUpdate =
        p.minPrice !== minPrice ||
        p.maxPrice !== maxPrice ||
        p.totalStock !== totalStock

      if (needsUpdate) {
        await Product.updateOne({ _id: p._id }, { $set: { minPrice, maxPrice, totalStock } })
        updated++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${updated} of ${products.length} products`,
      total: products.length,
      updated,
    })
  } catch (err) {
    logRouteError('POST /api/admin/migrate/backfill-prices', err)
    return apiError(500, { error: 'Migration failed' })
  }
}
