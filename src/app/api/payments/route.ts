import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { paymentsRateLimit } from '@/lib/rateLimit'
import { getAuthUser, getGuestSessionId } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { paymentCreateSchema } from '@/lib/commerceValidators'
import { chargeOrder } from '@/lib/services/paymentService'
import { getIdempotencyKey } from '@/lib/idempotencyHeader'
import {
  acquireIdempotency,
  completeIdempotency,
  failIdempotency,
  hashRequest,
} from '@/lib/idempotency'
import { apiError, logRouteError } from '@/lib/apiError'
import mongoose from 'mongoose'
import Order from '@/models/Order'

export async function POST(req: NextRequest) {
  const limited = await paymentsRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()

    const user = await getAuthUser(req)
    const sessionId = getGuestSessionId(req)

    // Must be logged in OR a guest with a session
    if (!user && !sessionId) {
      return apiError(401, { error: 'Unauthorized' })
    }

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const v = validateData(paymentCreateSchema, body)
    if (!v.success) return v.response

    if (!mongoose.Types.ObjectId.isValid(v.data.orderId)) {
      return apiError(400, { error: 'Invalid orderId' })
    }

    // Guests must prove ownership via the session that placed the order.
    let actorId: string
    if (user) {
      actorId = String(user._id)
    } else {
      if (!sessionId) {
        return apiError(401, { error: 'Cart session required for guest payment' })
      }
      const order = await Order.findOne({
        _id: v.data.orderId,
        guestSessionId: sessionId,
      }).select('guestEmail').lean<{ guestEmail?: string }>()

      if (!order?.guestEmail) {
        return apiError(404, { error: 'Order not found' })
      }
      actorId = order.guestEmail
    }

    const { key: idemKey } = getIdempotencyKey(req, v.data.idempotencyKey)

    const requestHash = hashRequest({
      userId: actorId,
      orderId: v.data.orderId,
      sourceId: v.data.sourceId,
    })

    const acq = await acquireIdempotency({
      key: idemKey,
      scope: 'payment',
      userId: user ? String(user._id) : undefined,
      requestHash,
    })

    if (acq.existing) {
      if (acq.existing.requestHash !== requestHash) {
        return apiError(409, {
          error: 'Idempotency key reuse with different payload',
          code: 'IDEMPOTENCY_CONFLICT',
        })
      }

      if (acq.existing.state === 'completed') {
        return NextResponse.json(acq.existing.response, {
          status: acq.existing.status ?? 200,
          headers: { 'Idempotent-Replay': 'true' },
        })
      }

      if (acq.existing.state === 'in_progress') {
        return apiError(409, {
          error: 'Payment already in progress',
          code: 'IDEMPOTENCY_IN_PROGRESS',
        })
      }

      return apiError(409, {
        error: 'Previous attempt failed; rotate idempotency key',
        code: 'IDEMPOTENCY_FAILED',
      })
    }

    const result = await chargeOrder({
      userId: user ? String(user._id) : undefined,
      guestEmail: !user ? actorId : undefined,
      orderId: v.data.orderId,
      sourceId: v.data.sourceId,
      idempotencyKey: idemKey,
      verificationToken: v.data.verificationToken,
    })

    if (!result.ok) {
      const status =
        result.code === 'ORDER_NOT_FOUND'
          ? 404
          : result.code === 'ORDER_NOT_PAYABLE'
            ? 409
            : result.code === 'PROVIDER_UNCONFIGURED'
              ? 503
              : 400

      const responseBody = {
        success: false,
        error: result.message,
        code: result.code,
        providerError: result.providerError,
      }

      await failIdempotency({ key: idemKey, status, response: responseBody })

      return NextResponse.json(responseBody, { status })
    }

    const responseBody = {
      success: true,
      payment: {
        id: result.paymentId,
        status: result.paymentStatus,
        receiptUrl: result.receiptUrl,
      },
      order: {
        id: v.data.orderId,
        status: result.orderStatus,
      },
    }

    await completeIdempotency({
      key: idemKey,
      status: 200,
      response: responseBody,
      resourceId: v.data.orderId,
    })

    return NextResponse.json(responseBody, {
      headers: {
        'Idempotency-Key': idemKey,
        'Idempotent-Replay': 'false',
      },
    })
  } catch (err) {
    logRouteError('POST /api/payments', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
