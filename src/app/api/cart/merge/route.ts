import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { cartRateLimit } from '@/lib/rateLimit'
import { getAuthUser } from '@/lib/getAuthUser'
import { addItem, getOrCreateCart, clearCart, summarizeCartWithCurrentPrices } from '@/lib/services/cartService'
import { apiError, logRouteError } from '@/lib/apiError'
import Cart from '@/models/Cart'
import type { ICart } from '@/types'

/**
 * POST /api/cart/merge
 * Body: { sessionId: string }
 * Merges a guest session cart into the authenticated user's cart,
 * then clears the session cart.
 */
export async function POST(req: NextRequest) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()

    const user = await getAuthUser(req)
    if (!user) return apiError(401, { error: 'Unauthorized' })

    const body = await req.json().catch(() => null)
    const sessionId: string | undefined = body?.sessionId
    if (!sessionId) return apiError(400, { error: 'sessionId required' })

    // Fetch guest cart
    const guestCart = await Cart.findOne({ sessionId }).lean<ICart>()

    if (guestCart && guestCart.items.length > 0) {
      const userOwner = { userId: user._id.toString() }

      // Add each guest item into the user cart (addItem handles qty merging & stock checks)
      for (const item of guestCart.items) {
        await addItem({
          owner: userOwner,
          productId: item.productId.toString(),
          variantSku: item.variantSku,
          quantity: item.quantity,
        })
      }

      // Clear the guest session cart fully
      await clearCart({ sessionId })
    }

    const summary = await summarizeCartWithCurrentPrices({ userId: user._id.toString() })
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    logRouteError('POST /api/cart/merge', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
