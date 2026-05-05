import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { cartRateLimit } from '@/lib/rateLimit'
import { getAuthUser, getGuestSessionId } from '@/lib/getAuthUser'
import { getOrCreateCart, summarizeCart, clearCart } from '@/lib/services/cartService'
import { apiError, logRouteError } from '@/lib/apiError'


async function resolveOwner(req: NextRequest) {
  const user = await getAuthUser(req)
  if (user) return { userId: user._id }
  const sessionId = getGuestSessionId(req)
  if (sessionId) return { sessionId }
  return null
}

export async function GET(req: NextRequest) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const owner = await resolveOwner(req)
    if (!owner) {
      return apiError(401, {
        error: 'Authenticate or send x-cart-session header',
        code: 'NO_OWNER',
      })
    }

    const cart = await getOrCreateCart(owner)
    const summary = await summarizeCart(cart)
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    logRouteError('GET /api/cart', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const owner = await resolveOwner(req)
    if (!owner) {
      return apiError(401, { error: 'Authenticate or send x-cart-session header' })
    }
    await clearCart(owner)
    const cart = await getOrCreateCart(owner)
    const summary = await summarizeCart(cart)
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    logRouteError('DELETE /api/cart', err)
    return apiError(500, { error: 'Internal server error' })
  }
}