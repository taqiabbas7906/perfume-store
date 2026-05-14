import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthUser } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { reviewSchema } from '@/lib/validators'
import { updateProductRating } from '@/lib/services/reviewService'
import Review from '@/models/Review'
import Order from '@/models/Order'
import Product from '@/models/Product'
import { REVIEW_ELIGIBLE_STATUSES } from '@/lib/constants'
import mongoose from 'mongoose'
import { z } from 'zod'

const listQuerySchema = z.object({
  productId: z.string().min(1),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

/* ─────────────────────────────────────────────────────────────
 * GET /api/reviews?productId=...&page=1&limit=10
 * Public — returns approved reviews for a product
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const url = new URL(req.url)
    const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return apiError(400, { error: 'Invalid query', details: parsed.error.flatten().fieldErrors })
    }
    const { productId, page, limit } = parsed.data

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiError(400, { error: 'Invalid productId' })
    }

    await connectDB()

    const filter = { product: new mongoose.Types.ObjectId(productId), approved: true }
    const skip = (page - 1) * limit

    const [total, reviews] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name')
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    logRouteError('GET /api/reviews', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/* ─────────────────────────────────────────────────────────────
 * POST /api/reviews
 * Auth required — user must have a qualifying order for the product
 * ───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const user = await getAuthUser(req)
    if (!user) return apiError(401, { error: 'Authentication required' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(reviewSchema, body)
    if (!validation.success) return validation.response

    const { orderId, productId, rating, comment } = validation.data

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return apiError(400, { error: 'Invalid orderId or productId' })
    }

    await connectDB()

    const [order, existing, productExists] = await Promise.all([
      Order.findOne({
        _id: orderId,
        user: user._id,
        status: { $in: REVIEW_ELIGIBLE_STATUSES },
      }).select('items').lean(),
      Review.exists({ order: orderId }),
      Product.exists({ _id: productId, active: true }),
    ])

    if (!order) return apiError(403, { error: 'No eligible order found for this product' })
    if (!order.items.some((i) => i.productId.toString() === productId)) {
      return apiError(403, { error: 'This product is not in the specified order' })
    }
    if (existing) return apiError(409, { error: 'You have already reviewed this order' })
    if (!productExists) return apiError(404, { error: 'Product not found' })

    const review = await Review.create({
      user: user._id,
      product: new mongoose.Types.ObjectId(productId),
      order: new mongoose.Types.ObjectId(orderId),
      rating,
      comment,
      approved: false,
    })

    return NextResponse.json({ success: true, review }, { status: 201 })
  } catch (err: unknown) {
    const mongoErr = err as { code?: number }
    if (mongoErr?.code === 11000) {
      return apiError(409, { error: 'You have already reviewed this order' })
    }
    logRouteError('POST /api/reviews', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
