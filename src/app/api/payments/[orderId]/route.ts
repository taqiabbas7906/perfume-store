import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { paymentsRateLimit } from '@/lib/rateLimit'
import { getAuthAdmin, getAuthUser, getGuestSessionId } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import mongoose from 'mongoose'
import type { IOrder } from '@/types'

type Ctx = { params: Promise<{ orderId: string }> }

const PAYMENT_PROJECTION = {
  status: 1,
  paymentStatus: 1,
  squarePaymentId: 1,
  paymentIntentId: 1,
  paymentError: 1,
  totalAmount: 1,
  currency: 1,
  paidAt: 1,
  user: 1,
  guestEmail: 1,
  guestSessionId: 1,
} as const

/**
 * GET /api/payments/[orderId]
 *
 * Auth:
 *   - Admin - any order
 *   - User  - own orders only
 *   - Guest - must present the cart session that created the order
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await paymentsRateLimit(req, { failClosed: true })
  if (limited) return limited

  try {
    const { orderId } = await ctx.params

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiError(400, { error: 'Invalid orderId' })
    }

    await connectDB()

    const admin = await getAuthAdmin(req)
    const user = admin ?? await getAuthUser(req)
    const guestSessionId = getGuestSessionId(req)

    const order = await Order.findById(orderId)
      .select(PAYMENT_PROJECTION)
      .lean<Pick<IOrder, '_id' | 'status' | 'paymentStatus' | 'squarePaymentId' | 'paymentIntentId' | 'paymentError' | 'totalAmount' | 'currency' | 'paidAt' | 'user' | 'guestEmail' | 'guestSessionId'>>()

    if (!order) return apiError(404, { error: 'Order not found' })

    // Authenticated users can only see their own orders (admins bypass).
    if (user && !admin) {
      if (!order.user || order.user.toString() !== user._id.toString()) {
        return apiError(403, { error: 'Forbidden' })
      }
    }

    // Guests must present the same cart session that created the order.
    if (!user) {
      if (!guestSessionId || order.guestSessionId !== guestSessionId) {
        return apiError(404, { error: 'Order not found' })
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        orderId: order._id,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        squarePaymentId: order.squarePaymentId ?? null,
        amount: order.totalAmount,
        currency: order.currency,
        paidAt: order.paidAt ?? null,
        error: order.paymentError ?? null,
      },
    })
  } catch (err) {
    logRouteError('GET /api/payments/[orderId]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
