import mongoose, { Schema, Model } from 'mongoose'
import type { INewsletterCampaign } from '@/types'

const NewsletterCampaignSchema = new Schema<INewsletterCampaign>(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    previewText: {
      type: String,
      default: '',
      trim: true,
      maxlength: 240,
    },
    content: {
      type: String,
      required: true,
      maxlength: 100_000,
    },
    audience: {
      type: String,
      enum: ['all', 'active', 'customers', 'vip'],
      default: 'all',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent'],
      default: 'draft',
      index: true,
    },
    sentAt: Date,
    scheduledAt: Date,
    sentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    openCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
)

NewsletterCampaignSchema.index({ createdAt: -1 })
NewsletterCampaignSchema.index({ status: 1, createdAt: -1 })

const NewsletterCampaign: Model<INewsletterCampaign> =
  mongoose.models.NewsletterCampaign ||
  mongoose.model<INewsletterCampaign>(
    'NewsletterCampaign',
    NewsletterCampaignSchema,
  )

export default NewsletterCampaign
