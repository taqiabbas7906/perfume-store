import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { cartRateLimit } from '@/lib/rateLimit'
import { getAuthUser } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { wishlistMoveToCartSchema } from '@/lib/validators'
import { addItem } from '@/lib/services/cartService'
import Wishlist from '@/models/Wishlist'
import mongoose from 'mongoose'
import type { IWishlist } from '@/types'

type Ctx = { params: Promise<{ productId: string }> }

/* ─────────────────────────────────────────────────────────────
 * POST /api/wishlist/[productId]/move-to-cart
 * Body: { variantSku, quantity? }
 * Adds the item to the cart then removes it from the wishlist.
 * ───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest, ctx: Ctx) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    const { productId } = await ctx.params
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiError(400, { error: 'Invalid productId' })
    }

    const user = await getAuthUser(req)
    if (!user) return apiError(401, { error: 'Authentication required' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(wishlistMoveToCartSchema, body)
    if (!validation.success) return validation.response

    const { variantSku, quantity } = validation.data

    await connectDB()

    const cartResult = await addItem({
      owner: { userId: user._id },
      productId,
      variantSku,
      quantity,
    })

    if (!cartResult.ok) {
      return apiError(400, { error: cartResult.message, code: cartResult.code })
    }

    // Remove from wishlist after successful cart add
    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { user: user._id },
      { $pull: { items: { productId: new mongoose.Types.ObjectId(productId) } } },
      { returnDocument: 'after' }
    ).lean<IWishlist>()

    return NextResponse.json({
      success: true,
      cart: cartResult.cart,
      wishlistItems: updatedWishlist?.items ?? [],
    })
  } catch (err) {
    logRouteError('POST /api/wishlist/[productId]/move-to-cart', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
