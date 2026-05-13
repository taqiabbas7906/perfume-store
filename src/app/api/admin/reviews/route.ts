import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Review from '@/models/Review'
import type { IReview } from '@/types'

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/reviews
 * Query: ?status=pending|approved|all&page=1&limit=20
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const sp     = req.nextUrl.searchParams
    const status = sp.get('status') ?? 'pending'
    const page   = Math.max(1, parseInt(sp.get('page') ?? '1'))
    const limit  = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '20')))
    const skip   = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (status === 'pending')  filter.approved = false
    if (status === 'approved') filter.approved = true
    // 'all' → no filter

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('product', 'name slug')
        .lean<IReview[]>(),
      Review.countDocuments(filter),
    ])

    return NextResponse.json({
      success: true,
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    logRouteError('GET /api/admin/reviews', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
