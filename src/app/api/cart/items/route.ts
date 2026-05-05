import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { cartRateLimit } from '@/lib/rateLimit'
import { getAuthUser, getGuestSessionId } from '@/lib/getAuthUser'
import { addItem, summarizeCart } from '@/lib/services/cartService'
import { validateData } from '@/lib/validate'
import { cartAddItemSchema } from '@/lib/commerceValidators'
import { apiError, logRouteError } from '@/lib/apiError'

async function resolveOwner(req: NextRequest) {
  const user = await getAuthUser(req)
  if (user) return { userId: user._id }
  const sessionId = getGuestSessionId(req)
  if (sessionId) return { sessionId }
  return null
}

export async function POST(req: NextRequest) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const v = validateData(cartAddItemSchema, body)
    if (!v.success) return v.response

    await connectDB()
    const owner = await resolveOwner(req)
    if (!owner) {
      return apiError(401, {
        error: 'Authenticate or send x-cart-session header',
      })
    }

    const result = await addItem({ owner, ...v.data })
    if (!result.ok) {
      const status = result.code === 'OUT_OF_STOCK' ? 409 : 400
      return apiError(status, {
        error: result.message,
        code: result.code,
        details: 'available' in result ? { available: result.available } : undefined,
      })
    }

    const summary = await summarizeCart(result.cart)
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    logRouteError('POST /api/cart/items', err)
    return apiError(500, { error: 'Internal server error' })
  }
}