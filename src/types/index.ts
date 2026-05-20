import type { Types } from 'mongoose'

/* ─────────────────────────────────────────────────────────────
 * USER
 * ───────────────────────────────────────────────────────────── */
export interface IUser {
  _id: Types.ObjectId
  name: string
  email: string
  password?: string
  firebaseUid: string
  hasPassword: boolean
  role: 'user' | 'admin'
  adminRole?: 'super_admin' | 'manager' | 'support'
  permissions?: (
    | 'all'
    | 'products'
    | 'orders'
    | 'reviews'
    | 'vouchers'
    | 'analytics'
    | 'users'
    | 'search-sync'
  )[]
  phone?: string
  emailVerified?: Date
  active: boolean
  deletedAt?: Date
  loginAttempts?: number
  lockUntil?: Date
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * ADDRESS
 * ───────────────────────────────────────────────────────────── */
export interface IAddress {
  _id: Types.ObjectId
  user: Types.ObjectId
  label: string          // e.g. "Home", "Work", "Other"
  recipientName: string
  phone?: string
  line1: string
  line2?: string
  city: string
  state?: string
  zip: string
  country: string        // ISO-3166-1 alpha-2 or full name
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * PRODUCT
 * ───────────────────────────────────────────────────────────── */
export interface IProduct {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string

  productType:
    | 'perfume'
    | 'lipstick'
    | 'makeup'
    | 'jewelry'
    | 'skincare'
    | 'other'

  brand: string
  category: string
  tags: string[]

  images: {
    url: string
    alt?: string
    isPrimary?: boolean
  }[]

  variants: {
    sku: string
    label: string
    originalPrice: number
    discountedPrice?: number
    quantity: number
    options?: Record<string, unknown>
    images?: string[]
  }[]

  attributes: Record<string, unknown>

  minPrice: number
  maxPrice: number
  totalStock: number

  ratingAverage: number
  ratingCount: number

  featured: boolean
  active: boolean
  freeDelivery: boolean
  isLimitedEdition: boolean
  isSample: boolean
  giftWrapping: { available: boolean; price: number }
  collectionId?: Types.ObjectId
  ingredients: string[]
  skinTypes: string[]
  publishedAt?: Date

  seo?: {
    metaTitle?: string
    metaDescription?: string
    canonicalUrl?: string
  }

  flashSale?: {
    active: boolean
    discountPercent: number
    startsAt?: Date
    endsAt?: Date
  }

  createdAt: Date
  updatedAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * CART
 * ───────────────────────────────────────────────────────────── */
export interface ICartItem {
  productId: Types.ObjectId
  variantSku: string
  quantity: number
  price: number
  name?: string
  variantLabel?: string
  image?: string
  addedAt?: Date
}

export interface ICartVoucher {
  code: string
  voucherId: Types.ObjectId
  discount: number
}

export interface ICart {
  _id: Types.ObjectId
  user?: Types.ObjectId
  sessionId?: string
  items: ICartItem[]
  vouchers?: ICartVoucher[]
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * ORDER STATUS (UNIFIED)
 * ───────────────────────────────────────────────────────────── */
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'refunded'

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'refunded'

/* ─────────────────────────────────────────────────────────────
 * ORDER
 * ───────────────────────────────────────────────────────────── */
export interface IOrderItem {
  productId: Types.ObjectId
  variantSku: string
  name: string
  image: string
  price: number
  quantity: number
  subtotal: number
}

export interface IShippingAddress {
  name: string
  address: string
  city: string
  state?: string
  country: string
  zip: string
  phone: string
}

export interface IOrderLog {
  ipAddress: string
  userAgent: string
  browser?: string
  device?: string
  os?: string
  country?: string
  city?: string
  timestamp: Date
}

export interface IOrderStatusEntry {
  status: OrderStatus
  changedAt: Date
  changedBy?: 'system' | 'admin' | 'customer' | 'webhook'
  adminId?: Types.ObjectId
  note?: string
}

export interface IOrder {
  _id: Types.ObjectId
  user?: Types.ObjectId | IUser
  guestEmail?: string
  guestSessionId?: string

  items: IOrderItem[]
  shippingAddress: IShippingAddress

  status: OrderStatus

  subtotal: number
  discount: number
  shipping: number
  tax: number
  totalAmount: number
  currency: string

  idempotencyKey: string
  paymentIdempotencyKey?: string

  paymentIntentId: string
  squarePaymentId?: string
  squareOrderId?: string

  paymentStatus: PaymentStatus
  paymentError?: string
  paidAt?: Date
  vouchersUsed?: (Types.ObjectId | IVoucher)[]
  inventoryReleased: boolean

  trackingNumber?: string
  trackingCarrier?: string
  trackingUrl?: string
  shippedAt?: Date
  cancelledAt?: Date
  cancelReason?: string

  statusHistory: IOrderStatusEntry[]

  orderLog: IOrderLog

  createdAt: Date
  updatedAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * VOUCHER
 * ───────────────────────────────────────────────────────────── */
export type VoucherType = 'percentage' | 'fixed' | 'free_shipping'
export type VoucherScope = 'all' | 'products' | 'categories' | 'first_order' | 'customers'

export interface IVoucher {
  _id: Types.ObjectId
  code: string
  type: VoucherType
  value: number
  minOrderAmount: number
  maxDiscountAmount?: number
  usageLimit?: number
  usedCount: number
  perUserLimit?: number
  expiresAt?: Date
  startsAt?: Date
  active: boolean
  featured: boolean
  stackable: boolean
  productIds?: Types.ObjectId[]
  categoryIds?: string[]
  customerIds?: Types.ObjectId[]
  firstOrderOnly: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IVoucherUsage {
  _id: Types.ObjectId
  voucherId: Types.ObjectId | IVoucher
  userId?: Types.ObjectId | IUser
  orderId?: Types.ObjectId | IOrder
  guestEmail?: string
  guestIp?: string
  discountAmount: number
  usedAt: Date
  createdAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * REVIEW
 * ───────────────────────────────────────────────────────────── */
export interface IReview {
  _id: Types.ObjectId
  user: Types.ObjectId | IUser
  product: Types.ObjectId | IProduct
  order: Types.ObjectId | IOrder
  rating: number
  comment: string
  approved: boolean
  createdAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * WISHLIST
 * ───────────────────────────────────────────────────────────── */
export interface IWishlistItem {
  productId: Types.ObjectId | IProduct
  addedAt: Date
}

export interface IWishlist {
  _id: Types.ObjectId
  user: Types.ObjectId | IUser
  items: IWishlistItem[]
  createdAt: Date
  updatedAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * NEWSLETTER
 * ───────────────────────────────────────────────────────────── */
export interface INewsletter {
  _id: Types.ObjectId
  email: string
  subscribedAt: Date
  active: boolean
}

export type NewsletterCampaignAudience = 'all' | 'active' | 'customers' | 'vip'
export type NewsletterCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'

export interface INewsletterCampaign {
  _id: Types.ObjectId
  subject: string
  previewText: string
  content: string
  audience: NewsletterCampaignAudience
  status: NewsletterCampaignStatus
  sentAt?: Date
  scheduledAt?: Date
  sentCount: number
  openCount: number
  clickCount: number
  createdBy?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
