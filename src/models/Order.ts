import mongoose, { Schema, Model } from 'mongoose'
import type { IOrder } from '@/types'

/* ─────────────────────────────────────────────
 * ORDER ITEM (CONSISTENT WITH TYPES)
 * ───────────────────────────────────────────── */
const OrderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    variantSku: { type: String, required: true },
    name: { type: String, required: true },
    variantLabel: { type: String, required: true },

    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },

    image: { type: String, default: '' },
  },
  { _id: false }
)

/* ─────────────────────────────────────────────
 * ORDER LOG (STRICT + SAFE DEFAULT)
 * ───────────────────────────────────────────── */
const OrderLogSchema = new Schema(
  {
    ipAddress: { type: String, default: 'unknown' },
    userAgent: { type: String, default: 'unknown' },
    browser: { type: String, default: 'unknown' },
    device: { type: String, default: 'unknown' },
    os: { type: String, default: 'unknown' },
    country: { type: String, default: 'unknown' },
    city: { type: String, default: 'unknown' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

/* ─────────────────────────────────────────────
 * SHIPPING
 * ───────────────────────────────────────────── */
const ShippingAddressSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    zip: { type: String, required: true },
  },
  { _id: false }
)

/* ─────────────────────────────────────────────
 * ORDER SCHEMA
 * ───────────────────────────────────────────── */
const OrderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    guestEmail: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: (v: unknown[]) => Array.isArray(v) && v.length > 0,
    },

    shippingAddress: {
      type: ShippingAddressSchema,
      required: true,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'paid',
        'failed',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
      ],
      default: 'pending',
      index: true,
    },

    /* ───────── MONEY ───────── */
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },

    vouchersUsed: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Voucher' }],
      default: [],
    },

    /* ───────── IDEMPOTENCY ───────── */
    idempotencyKey: { type: String, required: true },

    paymentIdempotencyKey: {
      type: String,
      sparse: true,
    },

    /* ───────── PAYMENT IDS ───────── */
    paymentIntentId: { type: String, default: '' },
    squarePaymentId: { type: String, sparse: true },
    squareOrderId: { type: String, sparse: true },

    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'authorized',
        'completed',
        'failed',
        'canceled',
        'refunded',
      ],
      default: 'pending',
      index: true,
    },

    paymentError: { type: String },
    paidAt: { type: Date },

    inventoryReleased: { type: Boolean, default: false },

    orderLog: {
      type: OrderLogSchema,
      default: () => ({
        ipAddress: 'unknown',
        userAgent: 'unknown',
        browser: 'unknown',
        device: 'unknown',
        os: 'unknown',
        country: 'unknown',
        city: 'unknown',
        timestamp: new Date(),
      }),
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

/* ─────────────────────────────────────────────
 * INDEXES (PRODUCTION SAFE)
 * ───────────────────────────────────────────── */
OrderSchema.index({ idempotencyKey: 1 }, { unique: true })
OrderSchema.index({ paymentIdempotencyKey: 1 }, { unique: true, sparse: true })
OrderSchema.index({ squarePaymentId: 1 }, { unique: true, sparse: true })
OrderSchema.index({ paymentIntentId: 1 })
OrderSchema.index({ user: 1, createdAt: -1 })

/* ─────────────────────────────────────────────
 * MODEL EXPORT (SAFE SINGLETON)
 * ───────────────────────────────────────────── */
const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>('Order', OrderSchema)

export default Order