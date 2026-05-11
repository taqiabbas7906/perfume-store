import mongoose, { Schema, Model } from 'mongoose'

export interface IBrand {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  description?: string
  logo?: string
  website?: string
  country?: string
  isLuxury: boolean
  active: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    logo: { type: String, match: /^https?:\/\/.+/ },
    website: { type: String, match: /^https?:\/\/.+/ },
    country: { type: String, trim: true, maxlength: 60 },
    isLuxury: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

BrandSchema.index({ active: 1, name: 1 })

const Brand: Model<IBrand> =
  mongoose.models.Brand ||
  mongoose.model<IBrand>('Brand', BrandSchema)

export default Brand
