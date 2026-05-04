import mongoose, { Schema } from 'mongoose'
import type { HydratedDocument } from 'mongoose'
import type { IProduct } from '@/types'

const ProductImageSchema = new Schema(
  {
    url: { type: String, required: true, match: /^https?:\/\/.+/ },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
)

const VariantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true, minlength: 3, maxlength: 64 },
    label: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },

    originalPrice: { type: Number, required: true, min: 0, max: 1_000_000 },

    discountedPrice: {
      type: Number,
      min: 0,
      max: 1_000_000,
      validate: {
        validator: function (this: { originalPrice: number }, v: number) {
          return v == null || v < this.originalPrice
        },
        message: 'discountedPrice must be less than originalPrice',
      },
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: { validator: Number.isInteger, message: 'quantity must be integer' },
    },

    // Flexible per-variant options (volume, shade, etc.)
    options: { type: Schema.Types.Mixed, default: {} },

    images: { type: [String], default: [] },
  },
  { _id: false }
)

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000,
    },

    productType: {
      type: String,
      required: true,
      enum: ['perfume', 'lipstick', 'other'],
      index: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
      index: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    tags: { type: [String], default: [], index: true },

    images: { type: [ProductImageSchema], default: [] },

    variants: {
      type: [VariantSchema],
      required: true,
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one variant required',
      },
    },

    /**
     * Flexible product-level attributes:
     * perfume → notes, concentration
     * lipstick → color, finish
     */
    attributes: { type: Schema.Types.Mixed, default: {} },

    // Aggregated fields
    minPrice: { type: Number, default: 0, index: true },
    maxPrice: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0, index: true },

    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },

    featured: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true, minimize: false }
)

// ✅ Indexes
ProductSchema.index({ active: 1, productType: 1, brand: 1 })
ProductSchema.index({ active: 1, category: 1, minPrice: 1 })

ProductSchema.index(
  { 'variants.sku': 1 },
  {
    unique: true,
    partialFilterExpression: { 'variants.sku': { $exists: true } },
  }
)

ProductSchema.index(
  { name: 'text', description: 'text', brand: 'text', tags: 'text' },
  {
    weights: { name: 5, brand: 3, tags: 2, description: 1 },
    name: 'product_text_index',
  }
)

// ✅ Pre-save hook (fixed, typed, async-safe)
ProductSchema.pre('save', function recomputeAggregates(this: IProduct & { isModified: (path: string) => boolean }) {
  if (this.isModified('variants')) {
    const prices = this.variants.flatMap((v) =>
      v.discountedPrice != null ? [v.discountedPrice] : [v.originalPrice]
    )
    this.minPrice = prices.length ? Math.min(...prices) : 0
    this.maxPrice = prices.length ? Math.max(...prices) : 0
    this.totalStock = this.variants.reduce((acc, v) => acc + (v.quantity || 0), 0)
  }
  if (this.isModified('active') && this.active && !this.publishedAt) {
    this.publishedAt = new Date()
  }
})

// ✅ Prevent model overwrite in dev (Next.js hot reload safe)
const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>('Product', ProductSchema)

export default Product