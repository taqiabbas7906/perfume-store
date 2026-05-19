import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Review from '@/models/Review'
import Product from '@/models/Product'
import User from '@/models/User'
import { escapeRegex } from '@/lib/utils/regex'
import mongoose from 'mongoose'
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
    const q      = sp.get('q')?.trim() ?? ''
    const page   = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
    const limit  = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)))
    const skip   = (page - 1) * limit

    const baseFilter: Record<string, unknown> = {}

    if (q) {
      const safe = escapeRegex(q)
      const [users, products] = await Promise.all([
        User.find({
          $or: [
            { name: { $regex: safe, $options: 'i' } },
            { email: { $regex: safe, $options: 'i' } },
          ],
        })
          .select('_id')
          .limit(50)
          .lean<{ _id: mongoose.Types.ObjectId }[]>(),
        Product.find({
          $or: [
            { name: { $regex: safe, $options: 'i' } },
            { slug: { $regex: safe, $options: 'i' } },
            { brand: { $regex: safe, $options: 'i' } },
          ],
        })
          .select('_id')
          .limit(50)
          .lean<{ _id: mongoose.Types.ObjectId }[]>(),
      ])

      const userIds = users.map((user) => user._id)
      const productIds = products.map((product) => product._id)
      const objectId = mongoose.Types.ObjectId.isValid(q)
        ? new mongoose.Types.ObjectId(q)
        : null

      baseFilter.$or = [
        { comment: { $regex: safe, $options: 'i' } },
        ...(userIds.length ? [{ user: { $in: userIds } }] : []),
        ...(productIds.length ? [{ product: { $in: productIds } }] : []),
        ...(objectId ? [{ _id: objectId }, { order: objectId }] : []),
      ]
    }

    const filter: Record<string, unknown> = { ...baseFilter }
    if (status === 'pending')  filter.approved = false
    if (status === 'approved') filter.approved = true
    // 'all' → no filter

    const [reviews, total, approvedCount, pendingCount] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('product', 'name slug brand images ratingAverage ratingCount')
        .populate('order', 'status totalAmount createdAt')
        .lean<IReview[]>(),
      Review.countDocuments(filter),
      Review.countDocuments({ ...baseFilter, approved: true }),
      Review.countDocuments({ ...baseFilter, approved: false }),
    ])

    return NextResponse.json({
      success: true,
      reviews,
      counts: {
        all: approvedCount + pendingCount,
        approved: approvedCount,
        pending: pendingCount,
      },
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    logRouteError('GET /api/admin/reviews', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
