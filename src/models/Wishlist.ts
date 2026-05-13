import mongoose, { Schema, Model } from 'mongoose'
import { IWishlist } from '@/types'

const WishlistItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
)

const WishlistSchema = new Schema<IWishlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [WishlistItemSchema], default: [] },
  },
  { timestamps: true }
)

WishlistSchema.index({ 'items.productId': 1 })

const Wishlist: Model<IWishlist> =
  mongoose.models.Wishlist || mongoose.model<IWishlist>('Wishlist', WishlistSchema)

export default Wishlist
