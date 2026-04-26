import mongoose, { Schema, Model } from 'mongoose'
import { IProduct } from '@/types'

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ['men', 'women', 'unisex'],
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    brand: {
      type: String,
      required: true,
    },
    sizes: {
      type: [String],
      default: [],
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

const Product: Model<IProduct> =
  mongoose.models.Product ||
  mongoose.model<IProduct>('Product', ProductSchema)

export default Product