import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthUser, getGuestSessionId } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { reserveStock, releaseReservation } from '@/lib/inventory'
import { z } from 'zod'

const reserveSchema = z.object({
  items: z.array(z.object({
    productId:  z.string().min(1),
    variantSku: z.string().min(1),
    quantity:   z.number().int().min(1).max(999),
  })).min(1).max(50),
})

/**
 * POST /api/checkout/reserve
 * Reserves stock for 15 minutes so nobody else can buy
 * the last unit while this user is on the payment page.
 *
 * Returns { ok: true } or { ok: false, unavailableSkus: string[] }
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const user      = await getAuthUser(req)
    const sessionId = getGuestSessionId(req)

    const sessionKey = user
      ? `user:${user._id}`
      : sessionId
      ? `guest:${sessionId}`
      : null

    if (!sessionKey) return apiError(401, { error: 'Unauthorized' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const parsed = reserveSchema.safeParse(body)
    if (!parsed.success) return apiError(400, { error: 'Validation failed', details: parsed.error.flatten() })

    const result = await reserveStock({
      sessionKey,
      items: parsed.data.items,
    })

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        error: `Insufficient stock for SKU "${result.failedSku}". Another customer may have just purchased the last unit.`,
        failedSku: result.failedSku,
      }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      message: 'Stock reserved for 15 minutes',
    })
  } catch (err) {
    logRouteError('POST /api/checkout/reserve', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/**
 * DELETE /api/checkout/reserve
 * Releases the reservation (user abandoned checkout or went back to cart).
 */
export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const user      = await getAuthUser(req)
    const sessionId = getGuestSessionId(req)

    const sessionKey = user
      ? `user:${user._id}`
      : sessionId
      ? `guest:${sessionId}`
      : null

    if (!sessionKey) return apiError(401, { error: 'Unauthorized' })

    await releaseReservation(sessionKey)
    return NextResponse.json({ success: true })
  } catch (err) {
    logRouteError('DELETE /api/checkout/reserve', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
