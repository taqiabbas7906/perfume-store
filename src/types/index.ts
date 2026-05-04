import type { Types } from 'mongoose'

/* ─────────────────────────────────────────────────────────────
 * User
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
 * Product (polymorphic / dynamic)
 *
 * A product has a `productType` (perfume | lipstick | other) which selects
 * the validation rules for the typed `attributes` payload. Each variant
 * (SKU) belongs to a product and carries its own price/stock + variant-level
 * options like size or shade.
 * ───────────────────────────────────────────────────────────── */
export type ProductType = 'perfume' | 'lipstick' | 'other'

export interface IProductImage {
  url: string
  alt?: string
  isPrimary?: boolean
}

export interface IProductVariant {
  sku: string
  /** Human-readable label e.g. \"50ml\", \"Ruby Red - Matte\" */
  label: string
  originalPrice: number
  discountedPrice?: number
  quantity: number
  /**
   * Variant-specific options that vary across SKUs.
   * For a perfume: { volumeMl: 50 }
   * For a lipstick: { color: \"#B91C1C\", colorName: \"Ruby Red\", finish: \"matte\" }
   */
  options?: Record<string, unknown>
  images?: string[]
}

/** Perfume-specific product attributes (validated via Zod when productType=\"perfume\") */
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

/** Lipstick-specific attributes */
export interface ILipstickAttributes {
  finish?: 'matte' | 'gloss' | 'satin' | 'metallic' | 'sheer'
  shade?: string
  formulation?: 'liquid' | 'stick' | 'pencil' | 'balm'
  longLasting?: boolean
  spfProtection?: number
}

export interface IProduct {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string
  productType: ProductType
  brand: string
  /** High-level taxonomy: 'fragrance', 'makeup', etc. Sub-classification handled by `tags`. */
  category: string
  tags: string[]
  images: IProductImage[]
  variants: IProductVariant[]
  /**
   * Free-form, type-specific attributes. Validated against the matching
   * Zod schema for `productType` at write time. Unknown product types
   * fall back to a permissive map.
   */
  attributes: Record<string, unknown> | IPerfumeAttributes | ILipstickAttributes
  /** Aggregate values cached for sorting/filtering — kept in sync by the API. */
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
 * Cart / Order / Voucher / Review / Newsletter
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