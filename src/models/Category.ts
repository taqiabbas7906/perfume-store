import mongoose, { Schema, Model } from 'mongoose'

export interface ICategory {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  description?: string
  image?: string
  parentId?: mongoose.Types.ObjectId
  productType?: string
  active: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String, match: /^https?:\/\/.+/ },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    productType: {
      type: String,
      enum: ['perfume', 'lipstick', 'makeup', 'jewelry', 'skincare', 'other', null],
      default: null,
    },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

CategorySchema.index({ active: 1, sortOrder: 1 })

const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>('Category', CategorySchema)

export default Category
