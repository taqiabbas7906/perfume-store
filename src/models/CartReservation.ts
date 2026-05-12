import mongoose, { Schema, Model } from 'mongoose'

/**
 * A CartReservation temporarily holds stock while a user is on the
 * payment step. When an order is placed the reservation is converted to a
 * permanent stock decrement. When it expires it is released back.
 *
 * TTL index auto-deletes documents after `expiresAt`.
 */
export interface ICartReservation {
  _id: mongoose.Types.ObjectId
  sessionKey: string            // userId or cartSessionId
  productId: mongoose.Types.ObjectId
  variantSku: string
  quantity: number
  expiresAt: Date               // TTL — auto-released after this
  createdAt: Date
}

const CartReservationSchema = new Schema<ICartReservation>(
  {
    sessionKey: { type: String, required: true, index: true },
    productId:  { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true },
    quantity:   { type: Number, required: true, min: 1 },
    expiresAt:  { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
)

// Compound index for fast lookup by session + product + sku
CartReservationSchema.index({ sessionKey: 1, productId: 1, variantSku: 1 })
CartReservationSchema.index({ productId: 1, variantSku: 1 })

// MongoDB TTL — automatically deletes expired reservations
CartReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const CartReservation: Model<ICartReservation> =
  mongoose.models.CartReservation ||
  mongoose.model<ICartReservation>('CartReservation', CartReservationSchema)

export default CartReservation
