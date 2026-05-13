import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { cartRateLimit } from '@/lib/rateLimit'
import { getAuthUser, getGuestSessionId } from '@/lib/getAuthUser'
import {
  getOrCreateCart,
  summarizeCart,
  summarizeCartWithCurrentPrices,
  clearCart,
  addVoucherToCart,
  removeVoucherFromCart,
} from '@/lib/services/cartService'
import { apiError, logRouteError } from '@/lib/apiError'
import { getRequestInfo } from '@/lib/getRequestInfo'
import Cart from '@/models/Cart'
import type { ICart } from '@/types'

function ownerFilter(owner: { userId?: unknown; sessionId?: unknown }) {
  if (owner.userId) return { user: owner.userId }
  if (owner.sessionId) return { sessionId: owner.sessionId }
  throw new Error('cart owner required')
}

async function resolveOwner(req: NextRequest) {
  const user = await getAuthUser(req)
  if (user) return { userId: user._id, user }
  const sessionId = getGuestSessionId(req)
  if (sessionId) return { sessionId, user: null }
  return null
}

export async function GET(req: NextRequest) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const ownerResult = await resolveOwner(req)
    if (!ownerResult) {
      return apiError(401, {
        error: 'Authenticate or send x-cart-session header',
        code: 'NO_OWNER',
      })
    }
    const { userId, sessionId, user } = ownerResult
    const owner = userId ? { userId } : { sessionId }

    let cart = await getOrCreateCart(owner)

    const voucherCodeParam = req.nextUrl.searchParams.get('voucherCode')
    const removeVoucherParam = req.nextUrl.searchParams.get('removeVoucher')

    if (removeVoucherParam) {
      cart = await removeVoucherFromCart(owner, removeVoucherParam)
    } else if (voucherCodeParam) {
      const applyResult = await addVoucherToCart({
        owner,
        voucherCode: voucherCodeParam,
        userId: user?._id.toString(),
        guestEmail: undefined,
        guestIp: getRequestInfo(req).ipAddress,
      })

      if (!applyResult.ok) {
        return apiError(400, { error: applyResult.message, code: applyResult.code })
      }
      cart = applyResult.cart
    }

    const summary = await summarizeCartWithCurrentPrices(owner)
    return NextResponse.json({
      success: true,
      ...summary,
    })
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
    const ownerResult = await resolveOwner(req)
    if (!ownerResult) {
      return apiError(401, { error: 'Authenticate or send x-cart-session header' })
    }
    const owner = ownerResult.userId
      ? { userId: ownerResult.userId }
      : { sessionId: ownerResult.sessionId }
    await clearCart(owner)
    const cart = await getOrCreateCart(owner)
    const summary = await summarizeCartWithCurrentPrices(owner)
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    logRouteError('DELETE /api/cart', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
