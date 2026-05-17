export interface StorefrontImage {
  url: string
  alt?: string
  isPrimary?: boolean
}

export interface StorefrontVariant {
  sku: string
  label: string
  originalPrice: number
  discountedPrice?: number
  quantity: number
}

export interface StorefrontProduct {
  _id: string
  slug: string
  name: string
  description?: string
  brand: string
  category: string
  productType?: string
  tags?: string[]
  images: StorefrontImage[]
  variants: StorefrontVariant[]
  minPrice: number
  maxPrice: number
  totalStock: number
  ratingAverage?: number
  ratingCount?: number
  featured?: boolean
  freeDelivery?: boolean
  isLimitedEdition?: boolean
  isSample?: boolean
  attributes?: Record<string, unknown>
}

export interface StorefrontCategory {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  productType?: string
  sortOrder?: number
}

export interface StorefrontBrand {
  _id: string
  name: string
  slug: string
  logo?: string
  description?: string
  featured?: boolean
}

export interface StorefrontCollection {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  featured?: boolean
}

export interface StorefrontPagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

export interface StorefrontProductListResponse {
  success: boolean
  products: StorefrontProduct[]
  pagination: StorefrontPagination
}
