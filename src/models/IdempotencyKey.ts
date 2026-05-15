import mongoose, { Schema, Model } from 'mongoose'
import type { IIdempotencyKey } from '@/types/commerce'

/**
 * Idempotency Key Model (Production Grade)
 *
 * Guarantees:
 * - Prevents duplicate order/payment execution under concurrency
 * - Safe for multi-instance deployments
 * - Supports TTL cleanup
 * - Safe for retry + webhook reconciliation flows
 */

const IdempotencySchema = new Schema<IIdempotencyKey>(
  {
    key: {
      type: String,
      required: true,
    },

    scope: {
      type: String,
      enum: ['order', 'payment'],
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    resourceId: {
      type: Schema.Types.ObjectId,
    },

    requestHash: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'in_progress',
    },

    status: {
      type: Number,
    },

    response: {
      type: Schema.Types.Mixed,
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

/* ─────────────────────────────────────────────
 * CRITICAL INDEXES (PRODUCTION SAFETY)
 * ───────────────────────────────────────────── */

/**
 * Ensures true idempotency under race conditions
 */
IdempotencySchema.index({ scope: 1, key: 1 }, { unique: true })

/**
 * Helps debugging + partitioning by scope
 */
IdempotencySchema.index({ scope: 1, state: 1 })

/**
 * Optional optimization for user-level lookups
 */
IdempotencySchema.index({ user: 1, createdAt: -1 })

/**
 * TTL index for automatic cleanup of old idempotency keys
 */
IdempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

/* ───────────────────────────────────────────── */

const IdempotencyKey: Model<IIdempotencyKey> =
  mongoose.models.IdempotencyKey ||
  mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencySchema)

export default IdempotencyKey
