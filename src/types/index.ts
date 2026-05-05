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
 * PRODUCT TYPES
 * ───────────────────────────────────────────────────────────── */
export type ProductType =
  | 'perfume'
  | 'lipstick'
  | 'makeup'
  | 'jewelry'
  | 'skincare'
  | 'other'

/* ─────────────────────────────────────────────────────────────
 * PRODUCT IMAGES
 * ───────────────────────────────────────────────────────────── */
export interface IProductImage {
  url: string
  alt?: string
  isPrimary?: boolean
}

/* ─────────────────────────────────────────────────────────────
 * VARIANT OPTIONS (KEY FIX FOR SKU SYSTEM)
 * Each SKU = unique combination of these
 * ───────────────────────────────────────────────────────────── */
export interface IVariantOptions {
  ml?: number              // perfume size
  color?: string           // lipstick color
  shade?: string
  finish?: string
  size?: string            // jewelry size
  material?: string
}

/* ─────────────────────────────────────────────────────────────
 * PRODUCT VARIANT (EACH = UNIQUE SKU)
 * ───────────────────────────────────────────────────────────── */
export interface IProductVariant {
  sku: string
  label: string
  originalPrice: number
  discountedPrice?: number
  quantity: number

  /**
   * IMPORTANT:
   * Defines uniqueness of SKU (ml, color, shade, etc.)
   */
  options?: IVariantOptions

  images?: string[]
}

/* ─────────────────────────────────────────────────────────────
 * PER-FLAVOR PRODUCT ATTRIBUTES
 * ───────────────────────────────────────────────────────────── */

/* PERFUME */
export interface IPerfumeAttributes {
  notes?: {
    top?: string[]
    middle?: string[]
    base?: string[]
  }
  concentration?: 'EDT' | 'EDP' | 'Parfum' | 'EDC' | 'Extrait'
  gender?: 'men' | 'women' | 'unisex'
  longevity?: 'low' | 'moderate' | 'long' | 'eternal'
  sillage?: 'soft' | 'moderate' | 'strong' | 'enormous'
  yearLaunched?: number
  perfumer?: string[]
}

/* LIPSTICK */
export interface ILipstickAttributes {
  finish?: 'matte' | 'gloss' | 'satin' | 'metallic' | 'sheer'
  shade?: string
  formulation?: 'liquid' | 'stick' | 'pencil' | 'balm'
  longLasting?: boolean
  spfProtection?: number
}

/* MAKEUP */
export interface IMakeupAttributes {
  finish?: 'matte' | 'gloss' | 'satin' | 'cream'
  skinType?: string[]
  waterproof?: boolean
}

/* JEWELRY */
export interface IJewelryAttributes {
  material?: string
  gemstone?: string
  size?: string
  weightGrams?: number
}

/* ─────────────────────────────────────────────────────────────
 * FINAL ATTRIBUTE UNION (IMPORTANT)
 * ───────────────────────────────────────────────────────────── */
export type IProductAttributes =
  | IPerfumeAttributes
  | ILipstickAttributes
  | IMakeupAttributes
  | IJewelryAttributes
  | Record<string, unknown>

/* ─────────────────────────────────────────────────────────────
 * PRODUCT
 * ───────────────────────────────────────────────────────────── */
export interface IProduct {
  _id: Types.ObjectId

  name: string
  slug: string
  description: string

  productType: ProductType

  brand: string
  category: string
  tags: string[]

  images: IProductImage[]

  /**
   * IMPORTANT:
   * Each variant = unique SKU (ml/color/shade/etc.)
   */
  variants: IProductVariant[]

  /**
   * Typed by productType at runtime validation
   */
  attributes: IProductAttributes

  /* ────────────────
   * Aggregates
   * ──────────────── */
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
  product: Types.ObjectId | IProduct
  variantSku: string
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

/* ─────────────────────────────────────────────────────────────
 * ORDER
 * ───────────────────────────────────────────────────────────── */
export interface IOrderItem {
  product: Types.ObjectId | IProduct
  variantSku: string
  name: string
  variantLabel: string
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