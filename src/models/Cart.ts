import mongoose, { Schema, Model } from 'mongoose'
import type { ICart } from '@/types'

/* ───────────────────────────────────────────── */
/* CART ITEM */
/* ───────────────────────────────────────────── */

const CartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    variantSku: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be integer',
      },
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    name: String,
    variantLabel: String,
    image: String,

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

/* ───────────────────────────────────────────── */
/* CART SCHEMA */
/* ───────────────────────────────────────────── */

const CartVoucherSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    voucherId: {
      type: Schema.Types.ObjectId,
      ref: 'Voucher',
      required: true,
    },
    discount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const CartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    sessionId: {
      type: String,
    },

    items: {
      type: [CartItemSchema],
      default: [],
    },

    vouchers: {
      type: [CartVoucherSchema],
      default: [],
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 86400 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

/* ───────────────────────────────────────────── */
/* PRODUCTION-GRADE INDEXING STRATEGY */
/* ───────────────────────────────────────────── */

/**
 * RULE:
 * A cart must belong to EXACTLY ONE identity type:
 * - either user
 * - or sessionId
 *
 * This prevents duplicate cart edge cases.
 */

/* Unique cart per user */
CartSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: 'objectId' } },
  }
)

/* Unique cart per guest session */
CartSchema.index(
  { sessionId: 1 },
  {
    unique: true,
    partialFilterExpression: { sessionId: { $type: 'string' } },
  }
)

/* Helps fast cart item lookups */
CartSchema.index({ 'items.productId': 1, 'items.variantSku': 1 })

/* ───────────────────────────────────────────── */

const Cart: Model<ICart> =
  mongoose.models.Cart || mongoose.model<ICart>('Cart', CartSchema)

export default Cart