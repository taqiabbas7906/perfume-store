import mongoose, { Schema, Model, models } from 'mongoose'
import type { IWebhookEvent } from '@/types/commerce'

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: {
      type: String,
      required: true,
      default: 'square',
      index: true,
    },

    eventId: {
      type: String,
      required: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
    },

    paymentId: {
      type: String,
      index: true,
    },

    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },

    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },

    receivedAt: {
      type: Date,
      default: Date.now,
    },

    processedAt: {
      type: Date,
    },

    error: {
      type: String,
    },
  },
  {
    timestamps: false,
    minimize: false,
  }
)

/* ─────────────────────────────────────────────
 * SAFE INDEX (no duplication issues)
 * ───────────────────────────────────────────── */
WebhookEventSchema.index(
  { provider: 1, eventId: 1 },
  { unique: true }
)

/* ─────────────────────────────────────────────
 * SAFE MODEL EXPORT (PRODUCTION SAFE)
 * ───────────────────────────────────────────── */
const WebhookEvent =
  (models.WebhookEvent as Model<IWebhookEvent>) ||
  mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema)

export default WebhookEvent