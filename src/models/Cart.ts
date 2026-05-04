import mongoose, { Schema, Model } from 'mongoose'
import { ICart } from '@/types'

const CartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const CartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
    sessionId: { type: String, sparse: true, index: true },
    items: { type: [CartItemSchema], default: [] },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      // TTL index — Mongo deletes the doc when expiresAt passes.
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
)

const Cart: Model<ICart> =
  (mongoose.models.Cart as Model<ICart>) || mongoose.model<ICart>('Cart', CartSchema)

export default Cart
