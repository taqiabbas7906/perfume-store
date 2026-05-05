import type { Types } from 'mongoose'

/* ─────────────────────────────────────────────
 * IDEMPOTENCY
 * ───────────────────────────────────────────── */
export type IdempotencyScope = 'order' | 'payment'
export type IdempotencyState = 'in_progress' | 'completed' | 'failed'

export interface IIdempotencyKey {
  _id: Types.ObjectId
  key: string
  scope: IdempotencyScope
  user?: Types.ObjectId
  resourceId?: Types.ObjectId
  requestHash: string
  state: IdempotencyState
  status?: number
  response?: unknown
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

/* ─────────────────────────────────────────────
 * WEBHOOK EVENT
 * ───────────────────────────────────────────── */
export interface IWebhookEvent {
  _id: Types.ObjectId
  provider: 'square'
  eventId: string
  eventType: string
  paymentId?: string
  orderId?: Types.ObjectId
  payload: unknown
  receivedAt: Date
  processedAt?: Date
  error?: string
}

/* ─────────────────────────────────────────────
 * CART ERRORS
 * ───────────────────────────────────────────── */
export type CartErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'PER_LINE_LIMIT'
  | 'CART_FULL'

export interface CartError {
  ok: false
  code: CartErrorCode
  message: string
  available?: number
}