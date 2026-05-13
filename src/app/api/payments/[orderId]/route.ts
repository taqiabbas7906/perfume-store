import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { paymentsRateLimit } from '@/lib/rateLimit'
import { getAuthAdmin, getAuthUser } from '@/lib/getAuthUser'
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
} as const

/**
 * GET /api/payments/[orderId]
 *
 * Auth:
 *   - Admin   — any order
 *   - User    — own orders only (order.user === user._id)
 *   - Guest   — orderId acts as the bearer token; ObjectId is 24-hex chars,
 *               not guessable, and this endpoint returns no PII beyond totals.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await paymentsRateLimit(req)
  if (limited) return limited

  try {
    const { orderId } = await ctx.params

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiError(400, { error: 'Invalid orderId' })
    }

    await connectDB()

    const admin = await getAuthAdmin(req)
    const user = admin ?? await getAuthUser(req)

    const order = await Order.findById(orderId)
      .select(PAYMENT_PROJECTION)
      .lean<Pick<IOrder, '_id' | 'status' | 'paymentStatus' | 'squarePaymentId' | 'paymentIntentId' | 'paymentError' | 'totalAmount' | 'currency' | 'paidAt' | 'user' | 'guestEmail'>>()

    if (!order) return apiError(404, { error: 'Order not found' })

    // Authenticated users can only see their own orders (admins bypass)
    if (user && !admin) {
      if (!order.user || order.user.toString() !== user._id.toString()) {
        return apiError(403, { error: 'Forbidden' })
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
