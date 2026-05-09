import Order from '@/models/Order'
import User from '@/models/User'
import type { IOrder } from '@/types'
import {
  getSquareClient,
  getSquareLocationId,
  isSquareConfigured,
  toMinorUnits,
  mapSquareStatus,
} from '@/lib/square'
import { releaseOrderInventory } from '@/lib/services/orderService'
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '@/lib/services/emailService'
import { logger } from '@/lib/logger'

/* ───────────────────────────────────────────── */

interface PayInput {
  userId?: string
  guestEmail?: string
  orderId: string
  sourceId: string
  idempotencyKey: string
  verificationToken?: string
}

export type PayResult =
  | {
      ok: true
      paymentId: string
      paymentStatus: IOrder['paymentStatus']
      orderStatus: IOrder['status']
      receiptUrl?: string
    }
  | {
      ok: false
      code:
        | 'ORDER_NOT_FOUND'
        | 'ORDER_NOT_PAYABLE'
        | 'PAYMENT_DECLINED'
        | 'PROVIDER_UNCONFIGURED'
        | 'INTERNAL'
      message: string
      providerError?: unknown
    }

/* ───────────────────────────────────────────── */

function extractSquareError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'unknown error'

  const e = err as Record<string, unknown>

  if (Array.isArray(e.errors) && e.errors.length > 0) {
    const firstErr = e.errors[0] as Record<string, unknown>
    return String(firstErr.detail || firstErr.message || 'square error')
  }

  return String(e.message || 'unknown error')
}

/* ───────────────────────────────────────────── */

export async function chargeOrder(input: PayInput): Promise<PayResult> {
  try {
    /* ───────── 1. FETCH ORDER ───────── */
    const orderFilter: Record<string, unknown> = { _id: input.orderId }
    if (input.userId) orderFilter.user = input.userId
    else if (input.guestEmail) orderFilter.guestEmail = input.guestEmail

    const order = await Order.findOne(orderFilter)

    if (!order) {
      return {
        ok: false,
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      }
    }

    /* ───────── 2. VALIDATION ───────── */
    if (
      order.status !== 'pending' ||
      !['pending', 'failed'].includes(order.paymentStatus)
    ) {
      return {
        ok: false,
        code: 'ORDER_NOT_PAYABLE',
        message: `Order is ${order.status}/${order.paymentStatus}`,
      }
    }

    /* ───────── 3. PROVIDER CHECK ───────── */
    if (!isSquareConfigured()) {
      return {
        ok: false,
        code: 'PROVIDER_UNCONFIGURED',
        message: 'Square is not configured',
      }
    }

    /* ───────── 4. IDEMPOTENCY LOCK ───────── */
    const claim = await Order.updateOne(
      {
        _id: order._id,
        $or: [
          { paymentIdempotencyKey: { $exists: false } },
          { paymentIdempotencyKey: input.idempotencyKey },
        ],
      },
      {
        $set: {
          paymentIdempotencyKey: input.idempotencyKey,
          paymentStatus: 'pending',
        },
      }
    )

    if (claim.modifiedCount !== 1 && claim.matchedCount !== 1) {
      const fresh = await Order.findById(order._id)

      if (
        fresh?.paymentIdempotencyKey &&
        fresh.paymentIdempotencyKey !== input.idempotencyKey
      ) {
        return {
          ok: false,
          code: 'ORDER_NOT_PAYABLE',
          message: 'Another payment in progress',
        }
      }
    }

    /* ───────── 5. SQUARE PAYMENT ───────── */
    const client = getSquareClient()
    const locationId = getSquareLocationId()

    // ✅ FIXED: Square v44 requires bigint
    const amountMoney = {
      amount: toMinorUnits(order.totalAmount), // bigint
      currency: (order.currency || 'USD') as 'USD',
    }

    const response = await client.payments.create({
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      amountMoney, // ✅ FIXED
      autocomplete: true,
      locationId,
      referenceId: String(order._id),
      note: `Order ${order._id}`,
      verificationToken: input.verificationToken,
    })

    const payment = response.payment
    const status = mapSquareStatus(payment?.status)
    const paymentId = payment?.id || ''

    /* ───────── 6. SUCCESS ───────── */
    if (status === 'completed' || status === 'authorized') {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            squarePaymentId: paymentId,
            paymentIntentId: paymentId,
            paymentStatus: status,
            status: status === 'completed' ? 'paid' : 'pending',
            paidAt: status === 'completed' ? new Date() : undefined,
            paymentError: undefined,
          },
        }
      )

      // Send payment confirmation email when payment is completed
      if (status === 'completed') {
        const updatedOrder = await Order.findById(order._id)
        if (updatedOrder) {
          const recipientEmail = input.guestEmail || (input.userId ? await User.findById(input.userId).then(u => u?.email) : null)
          if (recipientEmail) {
            sendOrderStatusUpdateEmail({
              order: updatedOrder,
              recipientEmail,
              oldStatus: 'pending',
              newStatus: 'paid',
            }).catch(err => {
              logger.error({ err, orderId: order._id }, 'Failed to send payment confirmation email')
            })
          }
        }
      }

      return {
        ok: true,
        paymentId,
        paymentStatus: status,
        orderStatus: status === 'completed' ? 'paid' : 'pending',
        receiptUrl: payment?.receiptUrl,
      }
    }

    /* ───────── 7. FAILED PAYMENT ───────── */
    if (status === 'failed' || status === 'canceled') {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            squarePaymentId: paymentId,
            paymentStatus: status,
            status: 'failed',
            paymentError: 'payment failed',
          },
        }
      )

      await releaseOrderInventory(String(order._id))

      return {
        ok: false,
        code: 'PAYMENT_DECLINED',
        message: 'Payment failed or canceled',
      }
    }

    /* ───────── 8. PENDING ───────── */
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          squarePaymentId: paymentId,
          paymentStatus: 'pending',
        },
      }
    )

    return {
      ok: true,
      paymentId,
      paymentStatus: 'pending',
      orderStatus: 'pending',
    }
  } catch (err) {
    const message = extractSquareError(err)

    logger.error(
      { err: message, orderId: input.orderId },
      'payment failed'
    )

    await Order.updateOne(
      { _id: input.orderId },
      {
        $set: {
          paymentStatus: 'failed',
          status: 'failed',
          paymentError: message,
        },
      }
    )

    await releaseOrderInventory(input.orderId)

    return {
      ok: false,
      code: 'PAYMENT_DECLINED',
      message,
      providerError: err,
    }
  }
}