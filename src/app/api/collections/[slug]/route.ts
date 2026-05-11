import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import Collection from '@/models/Collection'

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const { slug } = await ctx.params
    const now = new Date()

    const collection = await Collection.findOne({
      slug,
      active: true,
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    })
      .populate({
        path: 'products',
        match: { active: true },
        select: 'name slug images variants minPrice maxPrice ratingAverage ratingCount brand freeDelivery',
      })
      .lean()

    if (!collection) return apiError(404, { error: 'Collection not found' })

    return NextResponse.json({ success: true, collection })
  } catch (err) {
    logRouteError('GET /api/collections/[slug]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
