import mongoose, { Schema, Document } from 'mongoose'

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId
  squarePaymentId: string
  amount: number
  currency: string
  status: string
  idempotencyKey: string
  rawResponse?: any
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    squarePaymentId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    rawResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)
export default Payment