import mongoose, { Schema } from 'mongoose'
import { IProduct } from '@/types'

const SkuSchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    variant: {
      type: String,
      required: true,
      trim: true,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
      max: 100000,
    },
    discountedPrice: {
      type: Number,
      min: 0,
      max: 100000,
      validate: {
        validator: function (this: any, value: number) {
          if (!value) return true
          return value < this.originalPrice
        },
        message: 'Discounted price must be less than original price',
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
  },
  { _id: false }
)

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
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
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ['men', 'women', 'unisex'],
      required: true,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr: string[]) {
          return arr.every((url) => /^https?:\/\/.+/.test(url))
        },
        message: 'All image URLs must be valid HTTP(S) URLs',
      },
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    skus: {
      type: [SkuSchema],
      required: true,
      validate: {
        validator: function (arr: any[]) {
          return arr.length > 0
        },
        message: 'Product must have at least one SKU',
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

ProductSchema.index({ slug: 1 })
ProductSchema.index({ category: 1 })
ProductSchema.index({ active: 1 })
ProductSchema.index({ featured: 1 })
ProductSchema.index({ 'skus.sku': 1 })

const Product =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)

export default Product