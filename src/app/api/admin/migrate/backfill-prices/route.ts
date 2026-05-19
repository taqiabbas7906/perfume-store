import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Product from '@/models/Product'

interface VariantShape {
  discountedPrice?: number
  originalPrice?: number
  quantity?: number
}

/**
 * POST /api/admin/migrate/backfill-prices
 * Recalculates minPrice, maxPrice, totalStock for every product
 * that has variants but is missing these computed fields.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const products = await Product.find({}).select(
      'variants minPrice maxPrice totalStock',
    )

    let updated = 0
    for (const p of products) {
      const variants = (p.variants ?? []) as VariantShape[]
      if (variants.length === 0) continue

      const prices = variants.map((v) => v.discountedPrice ?? v.originalPrice ?? 0)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const totalStock = variants.reduce((s, v) => s + (v.quantity ?? 0), 0)

      const needsUpdate =
        p.minPrice !== minPrice ||
        p.maxPrice !== maxPrice ||
        p.totalStock !== totalStock

      if (needsUpdate) {
        await Product.updateOne(
          { _id: p._id },
          { $set: { minPrice, maxPrice, totalStock } },
        )
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
