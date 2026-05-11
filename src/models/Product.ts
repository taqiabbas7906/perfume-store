import mongoose, { Schema } from 'mongoose'
import type { IProduct } from '@/types'

/* ─────────────────────────────────────────────
 * IMAGE
 * ───────────────────────────────────────────── */
const ProductImageSchema = new Schema(
  {
    url: { type: String, required: true, match: /^https?:\/\/.+/ },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
)

/* ─────────────────────────────────────────────
 * VARIANT
 * ───────────────────────────────────────────── */
const VariantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true },

    label: { type: String, required: true, trim: true },

    originalPrice: { type: Number, required: true, min: 0 },

    discountedPrice: {
      type: Number,
      min: 0,
      validate: {
        validator(this: { originalPrice: number }, v: number) {
          return v == null || v < this.originalPrice
        },
      },
    },

    quantity: { type: Number, required: true, min: 0, default: 0 },

    options: { type: Schema.Types.Mixed, default: {} },

    images: { type: [String], default: [] },

    expiresAt: { type: Date }, // expiry / best-before for cosmetics
  },
  { _id: false }
)

/* ─────────────────────────────────────────────
 * PRODUCT
 * ───────────────────────────────────────────── */
const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },

    slug: { type: String, required: true, unique: true, index: true },

    description: { type: String, required: true },

    productType: {
      type: String,
      enum: ['perfume', 'lipstick', 'makeup', 'jewelry', 'skincare', 'other'],
      required: true,
    },

    brand: { type: String, required: true, index: true },

    category: { type: String, required: true, index: true },

    tags: { type: [String], default: [] },

    images: { type: [ProductImageSchema], default: [] },

    variants: {
      type: [VariantSchema],
      required: true,
      validate: (v: unknown[]) => Array.isArray(v) && v.length > 0,
    },

    attributes: { type: Schema.Types.Mixed, default: {} },

    minPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },

    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    freeDelivery: { type: Boolean, default: false },
    isLimitedEdition: { type: Boolean, default: false },
    isSample: { type: Boolean, default: false },
    giftWrapping: {
      available: { type: Boolean, default: false },
      price: { type: Number, default: 0, min: 0 },
    },
    collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', index: true },
    ingredients: { type: [String], default: [] },   // cosmetics ingredient list
    skinTypes: {                                     // skincare targeting
      type: [String],
      enum: ['oily', 'dry', 'combination', 'sensitive', 'normal', 'all'],
      default: [],
    },

    publishedAt: { type: Date },
  },
  { timestamps: true, minimize: false }
)

/* ─────────────────────────────────────────────
 * SAFE INDEXES (FIXED)
 * ───────────────────────────────────────────── */
ProductSchema.index({ active: 1, category: 1 })
ProductSchema.index({ active: 1, brand: 1 })

// ✅ SAFE: NO unique array index
ProductSchema.index({ 'variants.sku': 1 })

/* ─────────────────────────────────────────────
 * PRE-SAVE HOOK
 * ───────────────────────────────────────────── */
ProductSchema.pre('save', function () {
  if (this.isModified('variants')) {
    const prices = this.variants.map((v) =>
      v.discountedPrice ?? v.originalPrice
    )

    this.minPrice = Math.min(...prices)
    this.maxPrice = Math.max(...prices)

    this.totalStock = this.variants.reduce(
      (sum, v) => sum + v.quantity,
      0
    )
  }

  if (this.isModified('active') && this.active && !this.publishedAt) {
    this.publishedAt = new Date()
  }
})

/* ───────────────────────────────────────────── */
const Product =
  mongoose.models.Product ||
  mongoose.model<IProduct>('Product', ProductSchema)

export default Product