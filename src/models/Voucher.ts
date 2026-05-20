import mongoose, { Schema, Model } from 'mongoose'
import type { IVoucher } from '@/types'

const VoucherSchema = new Schema<IVoucher>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'free_shipping'],
      required: true,
      default: 'percentage',
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      min: 1,
    },
    usedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    perUserLimit: {
      type: Number,
      min: 1,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    startsAt: {
      type: Date,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    featured: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    stackable: {
      type: Boolean,
      required: true,
      default: false,
    },
    productIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    categoryIds: [String],
    customerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    firstOrderOnly: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

VoucherSchema.index({ active: 1, expiresAt: 1 })
VoucherSchema.index({ active: 1, featured: 1, expiresAt: 1 })
VoucherSchema.index({ productIds: 1 })
VoucherSchema.index({ customerIds: 1 })
VoucherSchema.index({ categoryIds: 1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.Voucher) {
  mongoose.deleteModel('Voucher')
}

const Voucher: Model<IVoucher> =
  (mongoose.models.Voucher as Model<IVoucher>) ||
  mongoose.model<IVoucher>('Voucher', VoucherSchema)

export default Voucher
