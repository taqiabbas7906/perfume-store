import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getAuthAdmin, getAuthUser } from '@/lib/getAuthUser'
import Order from '@/models/Order'
import Product from '@/models/Product'
import Review from '@/models/Review'
import { apiError, logRouteError } from '@/lib/apiError'
import mongoose from 'mongoose'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError(400, { error: 'Invalid order id' })
    }
    await connectDB()
    const admin = await getAuthAdmin(req)
    const user = admin ?? (await getAuthUser(req))
    if (!user) return apiError(401, { error: 'Unauthorized' })

    const query = admin ? { _id: id } : { _id: id, user: user._id }
    const orderDoc = await Order.findOne(query).lean()
    if (!orderDoc) return apiError(404, { error: 'Order not found' })

    // Enrich items with the live Product slug so the customer can deep-link.
    // (OrderItem stores productId only; slug is fetched on demand.)
    const productIds = (orderDoc.items ?? [])
      .map((it) => it.productId)
      .filter((v): v is mongoose.Types.ObjectId => !!v)

    const [products, existingReview] = await Promise.all([
      productIds.length > 0
        ? Product.find({ _id: { $in: productIds } })
            .select('_id slug')
            .lean()
        : Promise.resolve([] as Array<{ _id: mongoose.Types.ObjectId; slug: string }>),
      // One review per order (Review.order has a unique index). Surface so
      // the UI can hide the "Write Review" CTA once the user has reviewed.
      Review.findOne({ order: orderDoc._id })
        .select('product rating comment approved createdAt')
        .lean(),
    ])

    const slugById = new Map<string, string>(
      products.map((p) => [String(p._id), p.slug]),
    )

    const enrichedItems = (orderDoc.items ?? []).map((it) => ({
      ...it,
      slug: slugById.get(String(it.productId)) ?? null,
    }))

    return NextResponse.json({
      success: true,
      order: {
        ...orderDoc,
        items: enrichedItems,
        review: existingReview
          ? {
              productId: String(existingReview.product),
              rating: existingReview.rating,
              comment: existingReview.comment,
              approved: existingReview.approved,
              createdAt: existingReview.createdAt,
            }
          : null,
      },
    })
  } catch (err) {
    logRouteError('GET /api/orders/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
