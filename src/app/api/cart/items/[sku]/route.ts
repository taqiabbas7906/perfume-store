import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { cartRateLimit } from '@/lib/rateLimit'
import { getAuthUser, getGuestSessionId } from '@/lib/getAuthUser'
import { isCartErrorCode } from '@/lib/typeGuards/cart'
import {
  updateItem,
  removeItem,
  summarizeCart,
} from '@/lib/services/cartService'
import { validateData } from '@/lib/validate'
import { cartUpdateItemSchema } from '@/lib/commerceValidators'
import { apiError, logRouteError } from '@/lib/apiError'

type Ctx = { params: Promise<{ sku: string }> }

async function resolveOwner(req: NextRequest) {
  const user = await getAuthUser(req)
  if (user) return { userId: user._id }

  const sessionId = getGuestSessionId(req)
  if (sessionId) return { sessionId }

  return null
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    const { sku } = await ctx.params

    const body = await req.json().catch(() => null)
    if (!body) {
      return apiError(400, { error: 'Invalid JSON body' })
    }

    const v = validateData(cartUpdateItemSchema, body)
    if (!v.success) return v.response

    await connectDB()

    const owner = await resolveOwner(req)
    if (!owner) {
      return apiError(401, {
        error: 'Authenticate or send x-cart-session header',
      })
    }

    const result = await updateItem({
      owner,
      variantSku: sku,
      quantity: v.data.quantity,
    })

    if (!result.ok) {
      const code = result.code

      const status =
        code === 'OUT_OF_STOCK'
          ? 409
          : code === 'PRODUCT_NOT_FOUND'
            ? 404
            : 400

      return apiError(status, {
        error: result.message,
        code: isCartErrorCode(code) ? code : 'PRODUCT_NOT_FOUND',
        details:
          'available' in result ? { available: result.available } : undefined,
      })
    }
    const summary = await summarizeCart(result.cart)

    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (err) {
    logRouteError('PATCH /api/cart/items/[sku]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const limited = await cartRateLimit(req)
  if (limited) return limited

  try {
    const { sku } = await ctx.params

    await connectDB()

    const owner = await resolveOwner(req)
    if (!owner) {
      return apiError(401, {
        error: 'Authenticate or send x-cart-session header',
      })
    }

    const result = await removeItem(owner, sku)

    if (!result.ok) {
      return apiError(404, {
        error: result.message,
        code: result.code,
      })
    }

    const summary = await summarizeCart(result.cart)

    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (err) {
    logRouteError('DELETE /api/cart/items/[sku]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}