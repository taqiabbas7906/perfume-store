import mongoose, { Schema } from 'mongoose'
import { IOrder } from '@/types'

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true },
    name: { type: String, required: true },
    variantLabel: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
  },
  { _id: false }
)

const OrderLogSchema = new Schema(
  {
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    browser: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown' },
    city: { type: String, default: 'Unknown' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
      zip: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentIntentId: { type: String, required: true, index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    voucherUsed: { type: Schema.Types.ObjectId, ref: 'Voucher' },
    discount: { type: Number, default: 0, min: 0 },
    orderLog: { type: OrderLogSchema, required: true },
  },
  { timestamps: true }
)

const Order =
  (mongoose.models.Order as mongoose.Model<IOrder>) ||
  mongoose.model<IOrder>('Order', OrderSchema)

export default Order
