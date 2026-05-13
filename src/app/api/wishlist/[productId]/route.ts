import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { cartRateLimit } from '@/lib/rateLimit'
import { getAuthUser } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Wishlist from '@/models/Wishlist'
import mongoose from 'mongoose'
import type { IWishlist } from '@/types'

type Ctx = { params: Promise<{ productId: string }> }

/* ─────────────────────────────────────────────────────────────
 * DELETE /api/wishlist/[productId]
 * Removes one product from the user's wishlist
 * ───────────────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    const { productId } = await ctx.params
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiError(400, { error: 'Invalid productId' })
    }

    const user = await getAuthUser(req)
    if (!user) return apiError(401, { error: 'Authentication required' })

    await connectDB()

    const updated = await Wishlist.findOneAndUpdate(
      { user: user._id },
      { $pull: { items: { productId: new mongoose.Types.ObjectId(productId) } } },
      { returnDocument: 'after' }
    ).lean<IWishlist>()

    if (!updated) return apiError(404, { error: 'Wishlist not found' })

    return NextResponse.json({ success: true, items: updated.items })
  } catch (err) {
    logRouteError('DELETE /api/wishlist/[productId]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
