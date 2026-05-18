import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthUser } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import Review from '@/models/Review'
import mongoose from 'mongoose'

/* ─────────────────────────────────────────────────────────────
 * GET /api/reviews/eligibility?productId=...
 *
 * Auth required. Tells the client whether the current user can
 * write a new review (delivered order containing the product
 * with no existing review on that order) and/or edit an existing
 * one (returned with id, rating, comment, approved).
 *
 * Response:
 *   {
 *     success: true,
 *     canReview: boolean,
 *     orderId: string | null,        // order to associate the new review with
 *     review:  null | { _id, rating, comment, approved, orderId }
 *   }
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const productId = new URL(req.url).searchParams.get('productId')
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return apiError(400, { error: 'Invalid productId' })
    }

    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({
        success: true,
        canReview: false,
        orderId: null,
        review: null,
        reason: 'unauthenticated',
      })
    }

    await connectDB()

    const productObjId = new mongoose.Types.ObjectId(productId)

    // Existing review by this user for this product (most recent first).
    const existingReview = await Review.findOne({
      user: user._id,
      product: productObjId,
    })
      .sort({ createdAt: -1 })
      .select('_id rating comment approved order')
      .lean()

    // Find the most recent delivered order for this user containing
    // the product, that hasn't been reviewed yet (one review per order).
    const reviewedOrderIds = (await Review.find({ user: user._id }).distinct(
      'order',
    )) as unknown as mongoose.Types.ObjectId[]

    const deliveredOrder = await Order.findOne({
      user: user._id,
      status: 'delivered',
      'items.productId': productObjId,
      _id: { $nin: reviewedOrderIds },
    })
      .sort({ createdAt: -1 })
      .select('_id')
      .lean()

    return NextResponse.json({
      success: true,
      canReview: Boolean(deliveredOrder),
      orderId: deliveredOrder ? String(deliveredOrder._id) : null,
      review: existingReview
        ? {
            _id: String(existingReview._id),
            rating: existingReview.rating,
            comment: existingReview.comment,
            approved: existingReview.approved,
            orderId: String(existingReview.order),
          }
        : null,
    })
  } catch (err) {
    logRouteError('GET /api/reviews/eligibility', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
