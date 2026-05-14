import Order from '@/models/Order'
import WebhookEvent from '@/models/WebhookEvent'
import { mapSquareStatus, verifySquareWebhook } from '@/lib/square'
import { releaseOrderInventory, transitionOrderStatus } from '@/lib/services/orderService'
import { logger } from '@/lib/logger'

/* ───────────────────────────────────────────── */

export type WebhookResult =
  | { ok: true; deduplicated: boolean }
  | {
      ok: false
      code: 'INVALID_SIGNATURE' | 'BAD_PAYLOAD' | 'INTERNAL'
      message: string
    }

/* ───────────────────────────────────────────── */

interface SquareWebhookEnvelope {
  type?: string
  event_id?: string
  data?: {
    object?: {
      payment?: {
        id?: string
        status?: string
        reference_id?: string
        order_id?: string
      }
      refund?: {
        id?: string
        status?: string
        payment_id?: string
        amount_money?: { amount?: number; currency?: string }
      }
    }
  }
}

/* ───────────────────────────────────────────── */

function safeJsonParse(raw: string): SquareWebhookEnvelope | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/* ───────────────────────────────────────────── */

export async function ingestSquareEvent(args: {
  rawBody: string
  signature: string
  notificationUrl: string
  signatureKey: string
}): Promise<WebhookResult> {
  /* ───────── 1. SIGNATURE CHECK ───────── */
  if (!args.signatureKey) {
    return {
      ok: false,
      code: 'INVALID_SIGNATURE',
      message: 'Missing signature key',
    }
  }

  const valid = await verifySquareWebhook({
    rawBody: args.rawBody,
    signature: args.signature,
    notificationUrl: args.notificationUrl,
    signatureKey: args.signatureKey,
  })

  if (!valid) {
    return {
      ok: false,
      code: 'INVALID_SIGNATURE',
      message: 'Invalid webhook signature',
    }
  }

  /* ───────── 2. PARSE BODY ───────── */
  const body = safeJsonParse(args.rawBody)

  if (
    !body ||
    typeof body.event_id !== 'string' ||
    typeof body.type !== 'string' ||
    body.event_id.length < 1 ||
    body.event_id.length > 256
  ) {
    return {
      ok: false,
      code: 'BAD_PAYLOAD',
      message: 'Invalid webhook payload',
    }
  }

  const eventId = body.event_id

  /* ───────── 3. IDEMPOTENCY (DB LEVEL) ───────── */
  try {
    await WebhookEvent.create({
      provider: 'square',
      eventId,
      eventType: body.type,
      paymentId: body.data?.object?.payment?.id,
      payload: body,
      receivedAt: new Date(),
    })
  } catch (err: unknown) {
    // duplicate event (SAFE)
    if ((err as { code?: number })?.code === 11000) {
      logger.info({ eventId }, 'duplicate webhook ignored')
      return { ok: true, deduplicated: true }
    }

    logger.error({ err }, 'webhook insert failed')
    return {
      ok: false,
      code: 'INTERNAL',
      message: 'Failed to persist webhook',
    }
  }

  /* ───────── 4. PROCESS EVENT ───────── */
  try {
    if (body.type.startsWith('refund.')) {
      await reconcileRefund(body)
    } else {
      await reconcile(body)
    }

    await WebhookEvent.updateOne(
      { provider: 'square', eventId },
      { $set: { processedAt: new Date() } }
    )

    return { ok: true, deduplicated: false }
  } catch (err: unknown) {
    await WebhookEvent.updateOne(
      { provider: 'square', eventId },
      { $set: { error: (err as { message?: string })?.message || 'reconcile failed' } }
    )

    logger.error({ err }, 'webhook reconcile failed')

    return {
      ok: false,
      code: 'INTERNAL',
      message: 'reconcile failed',
    }
  }
}

/* ───────────────────────────────────────────── */

async function reconcile(body: SquareWebhookEnvelope): Promise<void> {
  const payment = body.data?.object?.payment
  if (!payment || typeof payment.id !== 'string' || !payment.id) return

  const refId  = typeof payment.reference_id === 'string' ? payment.reference_id : ''
  const status = mapSquareStatus(typeof payment.status === 'string' ? payment.status : undefined)

  /* ───────── ORDER LOOKUP (SAFE FALLBACK) ───────── */
  const order =
    (refId && /^[a-f\d]{24}$/i.test(refId) &&
      (await Order.findById(refId))) ||
    (await Order.findOne({ squarePaymentId: payment.id }))

  if (!order) {
    logger.warn(
      { paymentId: payment.id },
      'webhook received for unknown order'
    )
    return
  }

  /* ───────── IDENTITY GUARD (PREVENT DOUBLE PROCESSING) ───────── */
  const alreadyFinal =
    order.status === 'paid' ||
    order.status === 'cancelled' ||
    order.status === 'failed'

  if (alreadyFinal && status !== 'pending') {
    return
  }

  /* ───────── STATE MACHINE ───────── */
  switch (status) {
    case 'completed': {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            squarePaymentId: payment.id,
            paymentStatus: 'completed',
            status: 'paid',
            paymentIntentId: payment.id,
            paidAt: order.paidAt ?? new Date(),
            paymentError: undefined,
          },
        }
      )
      break
    }

    case 'failed': {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            squarePaymentId: payment.id,
            paymentStatus: 'failed',
            status: 'failed',
            paymentError: 'payment failed via webhook',
          },
        }
      )

      await releaseOrderInventory(String(order._id))
      break
    }

    case 'canceled': {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            squarePaymentId: payment.id,
            paymentStatus: 'canceled',
            status: 'cancelled',
          },
        }
      )

      await releaseOrderInventory(String(order._id))
      break
    }

    case 'authorized':
    case 'pending': {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            squarePaymentId: payment.id,
            paymentStatus: status,
          },
        }
      )
      break
    }

    default:
      // ignore unknown states safely
      break
  }
}

/* ───────────────────────────────────────────── */
/* REFUND RECONCILER
 *
 * Square sends refund.created / refund.updated separately from payment.*.
 * When a merchant issues a refund via the Square dashboard, we reflect it
 * locally: status → 'refunded', paymentStatus → 'refunded', inventory
 * released. Idempotent through transitionOrderStatus's CAS and
 * releaseOrderInventory's `inventoryReleased` flag.
 * ───────────────────────────────────────────── */
async function reconcileRefund(body: SquareWebhookEnvelope): Promise<void> {
  const refund = body.data?.object?.refund
  if (
    !refund ||
    typeof refund.id !== 'string' || !refund.id ||
    typeof refund.payment_id !== 'string' || !refund.payment_id
  ) {
    return
  }

  const refundStatus = (refund.status ?? '').toUpperCase()
  // Only act on terminal-success refunds. PENDING/REJECTED/FAILED don't change order state.
  if (refundStatus !== 'COMPLETED' && refundStatus !== 'APPROVED') return

  const order = await Order.findOne({ squarePaymentId: refund.payment_id }).select('_id status').lean<{ _id: unknown; status: string }>()
  if (!order) {
    logger.warn({ paymentId: refund.payment_id, refundId: refund.id }, 'refund webhook for unknown order')
    return
  }

  // Already refunded or cancelled — nothing to do.
  if (order.status === 'refunded' || order.status === 'cancelled') return

  const result = await transitionOrderStatus({
    orderId: String(order._id),
    nextStatus: 'refunded',
    changedBy: 'webhook',
    note: `Square refund ${refund.id}`,
  })

  if (!result.ok && result.code !== 'INVALID_TRANSITION') {
    logger.warn({ orderId: order._id, code: result.code }, 'refund transition failed')
  }
}