import mongoose, { Schema, Model } from 'mongoose'

export interface ICollection {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  description?: string
  image?: string
  products: mongoose.Types.ObjectId[]
  isLimitedEdition: boolean
  startsAt?: Date
  endsAt?: Date
  active: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: String, match: /^https?:\/\/.+/ },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    isLimitedEdition: { type: Boolean, default: false },
    startsAt: { type: Date },
    endsAt: { type: Date },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

CollectionSchema.index({ active: 1, sortOrder: 1 })
CollectionSchema.index({ active: 1, endsAt: 1 })

const Collection: Model<ICollection> =
  mongoose.models.Collection ||
  mongoose.model<ICollection>('Collection', CollectionSchema)

export default Collection
