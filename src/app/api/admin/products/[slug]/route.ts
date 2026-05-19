import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'

type RouteContext = {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/admin/products/[slug]
 *
 * Admin-only fetch by slug. Unlike the public GET, this returns the product
 * regardless of `active` so admins can load and edit inactive items.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const { slug } = await ctx.params

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const product = await Product.findOne({ slug }).select('-__v').lean()

    if (!product) {
      return apiError(404, { error: 'Product not found' })
    }

    return NextResponse.json({ success: true, product })
  } catch (err) {
    logRouteError('GET /api/admin/products/[slug]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
