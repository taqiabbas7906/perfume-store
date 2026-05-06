import mongoose, { Schema, Model } from 'mongoose'
import type { IVoucherUsage } from '@/types'

const VoucherUsageSchema = new Schema<IVoucherUsage>(
  {
    voucherId: {
      type: Schema.Types.ObjectId,
      ref: 'Voucher',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    guestEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    usedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

VoucherUsageSchema.index({ voucherId: 1 })
VoucherUsageSchema.index({ userId: 1 })
VoucherUsageSchema.index({ guestEmail: 1 })
VoucherUsageSchema.index({ voucherId: 1, userId: 1 })
VoucherUsageSchema.index({ voucherId: 1, guestEmail: 1 })
VoucherUsageSchema.index({ orderId: 1 }, { unique: true, sparse: true })

const VoucherUsage: Model<IVoucherUsage> =
  mongoose.models.VoucherUsage || mongoose.model<IVoucherUsage>('VoucherUsage', VoucherUsageSchema)

export default VoucherUsage
