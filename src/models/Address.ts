import mongoose, { Schema, Model } from 'mongoose'
import type { IAddress } from '@/types'

const AddressSchema = new Schema<IAddress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    label: {
      type: String,
      trim: true,
      maxlength: 30,
      default: 'Home',
    },

    recipientName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    line1: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },

    line2: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },

    state: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    zip: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },

    country: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

/* ── Compound index: fetch all addresses for a user sorted newest first ── */
AddressSchema.index({ user: 1, createdAt: -1 })

/* ── Max 10 addresses per user enforced at route layer ── */

const Address: Model<IAddress> =
  (mongoose.models.Address as Model<IAddress>) ||
  mongoose.model<IAddress>('Address', AddressSchema)

export default Address
