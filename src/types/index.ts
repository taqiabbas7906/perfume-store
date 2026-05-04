import { Types } from 'mongoose'

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

export interface ISku {
  sku: string
  variant: string
  originalPrice: number
  discountedPrice?: number
  quantity: number
}

export interface IProduct {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string
  category: 'men' | 'women' | 'unisex'
  images: string[]
  brand: string
  skus: ISku[]
  featured: boolean
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ICartItem {
  product: Types.ObjectId | IProduct
  quantity: number
  price: number
}

export interface ICart {
  _id: Types.ObjectId
  user?: Types.ObjectId
  sessionId?: string
  items: ICartItem[]
  expiresAt: Date
}

export interface IOrderItem {
  product: Types.ObjectId | IProduct
  name: string
  price: number
  quantity: number
  image: string
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'

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
  browser: string
  device: string
  os: string
  country: string
  city: string
  timestamp: Date
}

export interface IOrder {
  _id: Types.ObjectId
  user: Types.ObjectId | IUser
  items: IOrderItem[]
  shippingAddress: IShippingAddress
  status: OrderStatus
  paymentIntentId: string
  totalAmount: number
  voucherUsed?: Types.ObjectId
  discount?: number
  orderLog: IOrderLog
  createdAt: Date
  updatedAt: Date
}

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

export interface INewsletter {
  _id: Types.ObjectId
  email: string
  subscribedAt: Date
  active: boolean
}