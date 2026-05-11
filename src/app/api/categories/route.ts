import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import Category from '@/models/Category'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const productType = searchParams.get('productType')
    const filter: Record<string, unknown> = { active: true }
    if (productType) filter.productType = productType
    const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean()
    return NextResponse.json({ success: true, categories })
  } catch (err) {
    logRouteError('GET /api/categories', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
