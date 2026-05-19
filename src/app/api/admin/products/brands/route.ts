import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'

/**
 * GET /api/admin/products/brands
 *
 * Returns the distinct brand strings that appear on real products — used to
 * populate the brand filter dropdown in the admin products panel.
 *
 * This is intentionally different from /api/admin/brands (which lists the
 * Brand collection): products can have any brand string, so the filter has
 * to mirror what's actually in the data, not what's been catalogued.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const raw = (await Product.distinct('brand')) as unknown[]
    const brands = raw
      .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
      .map((b) => b.trim())
      .sort((a, b) => a.localeCompare(b))

    return NextResponse.json({ success: true, brands })
  } catch (err) {
    logRouteError('GET /api/admin/products/brands', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
