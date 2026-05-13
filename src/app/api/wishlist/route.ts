import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { cartRateLimit } from '@/lib/rateLimit'
import { getAuthUser } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { wishlistAddSchema } from '@/lib/validators'
import Wishlist from '@/models/Wishlist'
import Product from '@/models/Product'
import mongoose from 'mongoose'
import type { IWishlist } from '@/types'

const MAX_WISHLIST_ITEMS = 100

/* ─────────────────────────────────────────────────────────────
 * GET /api/wishlist
 * Returns the authenticated user's wishlist with product details
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    const user = await getAuthUser(req)
    if (!user) return apiError(401, { error: 'Authentication required' })

    await connectDB()

    const wishlist = await Wishlist.findOne({ user: user._id })
      .populate('items.productId', 'name slug images minPrice active brand')
      .lean<IWishlist>()

    return NextResponse.json({
      success: true,
      items: wishlist?.items ?? [],
    })
  } catch (err) {
    logRouteError('GET /api/wishlist', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/* ─────────────────────────────────────────────────────────────
 * POST /api/wishlist
 * Body: { productId }
 * ───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    const user = await getAuthUser(req)
    if (!user) return apiError(401, { error: 'Authentication required' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(wishlistAddSchema, body)
    if (!validation.success) return validation.response

    const { productId } = validation.data
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiError(400, { error: 'Invalid productId' })
    }

    await connectDB()

    const product = await Product.exists({ _id: productId, active: true })
    if (!product) return apiError(404, { error: 'Product not found' })

    // Get or create wishlist, check for duplicate and cap
    let wishlist = await Wishlist.findOne({ user: user._id }).lean<IWishlist>()

    if (wishlist) {
      const alreadyIn = wishlist.items.some(
        (i) => i.productId.toString() === productId
      )
      if (alreadyIn) {
        return NextResponse.json({ success: true, message: 'Already in wishlist' })
      }
      if (wishlist.items.length >= MAX_WISHLIST_ITEMS) {
        return apiError(400, { error: 'Wishlist is full (max 100 items)' })
      }
    }

    const updated = await Wishlist.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: { user: user._id },
        $push: { items: { productId: new mongoose.Types.ObjectId(productId), addedAt: new Date() } },
      },
      { upsert: true, new: true }
    )
      .populate('items.productId', 'name slug images minPrice active brand')
      .lean<IWishlist>()

    return NextResponse.json({ success: true, items: updated?.items ?? [] }, { status: 201 })
  } catch (err) {
    logRouteError('POST /api/wishlist', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
