import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthUser, getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { reviewApproveSchema } from '@/lib/validators'
import { updateProductRating } from '@/lib/services/reviewService'
import Review from '@/models/Review'
import mongoose from 'mongoose'
import type { IReview } from '@/types'

type Ctx = { params: Promise<{ id: string }> }

/* ─────────────────────────────────────────────────────────────
 * GET /api/reviews/[id]
 * Admin: any review. User: own review only.
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) return apiError(400, { error: 'Invalid id' })

    await connectDB()

    const admin = await getAuthAdmin(req)
    const user = admin ?? (await getAuthUser(req))
    if (!user) return apiError(401, { error: 'Authentication required' })

    const review = await Review.findById(id)
      .populate('user', 'name email')
      .populate('product', 'name slug')
      .lean<IReview>()

    if (!review) return apiError(404, { error: 'Review not found' })

    if (!admin && review.user.toString() !== user._id.toString()) {
      return apiError(403, { error: 'Forbidden' })
    }

    return NextResponse.json({ success: true, review })
  } catch (err) {
    logRouteError('GET /api/reviews/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/* ─────────────────────────────────────────────────────────────
 * PATCH /api/reviews/[id]
 * Admin only — approve or reject a review
 * ───────────────────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) return apiError(400, { error: 'Invalid id' })

    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(reviewApproveSchema, body)
    if (!validation.success) return validation.response

    await connectDB()

    const review = await Review.findByIdAndUpdate(
      id,
      { $set: { approved: validation.data.approved } },
      { new: true }
    ).lean<IReview>()

    if (!review) return apiError(404, { error: 'Review not found' })

    await updateProductRating(review.product.toString())

    return NextResponse.json({ success: true, review })
  } catch (err) {
    logRouteError('PATCH /api/reviews/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/* ─────────────────────────────────────────────────────────────
 * DELETE /api/reviews/[id]
 * Admin or review owner
 * ───────────────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) return apiError(400, { error: 'Invalid id' })

    await connectDB()

    const admin = await getAuthAdmin(req)
    const user = admin ?? (await getAuthUser(req))
    if (!user) return apiError(401, { error: 'Authentication required' })

    const review = await Review.findById(id).lean<IReview>()
    if (!review) return apiError(404, { error: 'Review not found' })

    if (!admin && review.user.toString() !== user._id.toString()) {
      return apiError(403, { error: 'Forbidden' })
    }

    const productId = review.product.toString()
    await Review.deleteOne({ _id: id })
    await updateProductRating(productId)

    return NextResponse.json({ success: true })
  } catch (err) {
    logRouteError('DELETE /api/reviews/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
