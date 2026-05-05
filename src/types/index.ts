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
  image?: string
  emailVerified?: Date
  active: boolean
  loginAttempts?: number
  lockUntil?: Date
  lastLogin?: Date
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
    options?: Record<string, any>
    images?: string[]
  }[]

  attributes: Record<string, any>

  minPrice: number
  maxPrice: number
  totalStock: number

  ratingAverage: number
  ratingCount: number

  featured: boolean
  active: boolean
  publishedAt?: Date

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

export interface ICart {
  _id: Types.ObjectId
  user?: Types.ObjectId
  sessionId?: string
  items: ICartItem[]
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
  country: string
  zip: string
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

export interface IOrder {
  _id: Types.ObjectId
  user: Types.ObjectId | IUser

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
  voucherUsed?: Types.ObjectId | null
  inventoryReleased: boolean

  orderLog: IOrderLog

  createdAt: Date
  updatedAt: Date
}

/* ─────────────────────────────────────────────────────────────
 * VOUCHER
 * ───────────────────────────────────────────────────────────── */
export interface IVoucher {
  _id: Types.ObjectId
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount: number
  usageLimit: number
  usedCount: number
  expiresAt: Date
  active: boolean
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
 * NEWSLETTER
 * ───────────────────────────────────────────────────────────── */
export interface INewsletter {
  _id: Types.ObjectId
  email: string
  subscribedAt: Date
  active: boolean
}