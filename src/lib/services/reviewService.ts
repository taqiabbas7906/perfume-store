import { Types } from 'mongoose'
import Review from '@/models/Review'
import Product from '@/models/Product'

/**
 * Recomputes ratingAverage + ratingCount on the Product document
 * from all *approved* reviews. Call after any review state change.
 */
export async function updateProductRating(
  productId: Types.ObjectId | string
): Promise<void> {
  const result = await Review.aggregate([
    {
      $match: {
        product: new Types.ObjectId(productId.toString()),
        approved: true,
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ])

  const agg = result[0]
  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        ratingAverage: agg ? Math.round(agg.avg * 10) / 10 : 0,
        ratingCount: agg ? agg.count : 0,
      },
    }
  )
}
