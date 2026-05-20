import { z } from 'zod'

/* ─────────────────────────────────────────────────────────────
 * Auth
 * ───────────────────────────────────────────────────────────── */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(254)
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim()

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  )

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2).max(50).trim(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const changePasswordSchema = z
  .discriminatedUnion('hasPassword', [
    z.object({
      hasPassword: z.literal(true),
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordSchema,
      confirmPassword: passwordSchema,
    }),
    z.object({
      hasPassword: z.literal(false),
      currentPassword: z.string().optional(),
      newPassword: passwordSchema,
      confirmPassword: passwordSchema,
    }),
  ])
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/* ─────────────────────────────────────────────────────────────
 * Product validators (polymorphic)
 *
 * `productType` selects which `attributes` schema applies. Variants are
 * generic: `options` is a free-form record so any product type can store
 * its variant axes (volume, shade, etc.) without schema changes.
 * ───────────────────────────────────────────────────────────── */

export const productImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  alt: z.string().max(200).optional(),
  isPrimary: z.boolean().optional(),
})

export const variantSchema = z
  .object({
    sku: z
      .string()
      .min(3, 'SKU must be at least 3 characters')
      .max(64, 'SKU is too long')
      .regex(/^[A-Za-z0-9._\-]+$/, 'SKU can only contain letters, numbers, dot, dash, underscore'),
    label: z.string().min(1).max(80).trim(),
    originalPrice: z.number().nonnegative().max(1_000_000),
    discountedPrice: z.number().nonnegative().max(1_000_000).optional(),
    quantity: z.number().int().nonnegative(),
    options: z.record(z.string(), z.unknown()).optional(),
    images: z.array(z.string().url()).optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .refine(
    (v) => v.discountedPrice == null || v.discountedPrice < v.originalPrice,
    { message: 'Discounted price must be less than original price', path: ['discountedPrice'] }
  )

/** Per-product-type attribute schemas */
export const perfumeAttributesSchema = z.object({
  notes: z
    .object({
      top: z.array(z.string().min(1).max(60)).max(20).optional(),
      middle: z.array(z.string().min(1).max(60)).max(20).optional(),
      base: z.array(z.string().min(1).max(60)).max(20).optional(),
    })
    .optional(),
  concentration: z.enum(['EDT', 'EDP', 'Parfum', 'EDC', 'Extrait']).optional(),
  gender: z.enum(['men', 'women', 'unisex']).optional(),
  longevity: z.enum(['low', 'moderate', 'long', 'eternal']).optional(),
  sillage: z.enum(['soft', 'moderate', 'strong', 'enormous']).optional(),
  yearLaunched: z.number().int().min(1800).max(new Date().getFullYear() + 1).optional(),
  perfumer: z.array(z.string().min(1).max(100)).max(10).optional(),
})

export const lipstickAttributesSchema = z.object({
  finish: z.enum(['matte', 'gloss', 'satin', 'metallic', 'sheer']).optional(),
  shade: z.string().min(1).max(60).optional(),
  formulation: z.enum(['liquid', 'stick', 'pencil', 'balm']).optional(),
  longLasting: z.boolean().optional(),
  spfProtection: z.number().int().min(0).max(100).optional(),
})

/** Generic / unknown product type — accept any JSON-like map. */
export const genericAttributesSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number(), z.boolean()])),
    z.record(z.string(), z.unknown()),
    z.null(),
  ])
)

const baseProductFields = {
  name: z.string().min(2).max(200).trim(),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
    .toLowerCase()
    .trim(),
  description: z.string().min(10).max(5000).trim(),
  brand: z.string().min(1).max(100).trim(),
  category: z.string().min(1).max(60).toLowerCase().trim(),
  tags: z.array(z.string().min(1).max(40)).max(30).default([]),
  images: z.array(productImageSchema).max(20).default([]),
  variants: z.array(variantSchema).min(1, 'At least one variant required').max(50),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  freeDelivery: z.boolean().default(false),
  isLimitedEdition: z.boolean().default(false),
  isSample: z.boolean().default(false),
  giftWrapping: z.object({
    available: z.boolean().default(false),
    price: z.number().nonnegative().default(0),
  }).default({ available: false, price: 0 }),
  collectionId: z.string().optional().nullable(),
  ingredients: z.array(z.string().min(1).max(80)).max(100).default([]),
  skinTypes: z.array(z.enum(['oily', 'dry', 'combination', 'sensitive', 'normal', 'all'])).default([]),
  seo: z.object({
    metaTitle: z.string().max(60).trim().optional(),
    metaDescription: z.string().max(160).trim().optional(),
    canonicalUrl: z.string().url('Invalid canonical URL').optional(),
  }).default({}),
  flashSale: z.object({
    active: z.boolean().default(false),
    discountPercent: z.number().min(0).max(99).default(0),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
  }).default({ active: false, discountPercent: 0 }),
}

/**
 * Discriminated union by `productType` so each type validates against its
 * own attribute schema. Adding a new type = adding one branch here.
 */
export const productCreateSchema = z.discriminatedUnion('productType', [
  z.object({
    productType: z.literal('perfume'),
    attributes: perfumeAttributesSchema.default({}),
    ...baseProductFields,
  }),
  z.object({
    productType: z.literal('lipstick'),
    attributes: lipstickAttributesSchema.default({}),
    ...baseProductFields,
  }),
  z.object({
    productType: z.literal('makeup'),
    attributes: genericAttributesSchema.default({}),
    ...baseProductFields,
  }),
  z.object({
    productType: z.literal('skincare'),
    attributes: genericAttributesSchema.default({}),
    ...baseProductFields,
  }),
  z.object({
    productType: z.literal('jewelry'),
    attributes: genericAttributesSchema.default({}),
    ...baseProductFields,
  }),
  z.object({
    productType: z.literal('other'),
    attributes: genericAttributesSchema.default({}),
    ...baseProductFields,
  }),
])

/**
 * For PATCH / PUT we accept partial updates. We can't make the full union
 * partial directly, so we expose a permissive update schema and then
 * re-validate the resulting document via `productCreateSchema` at the
 * route layer if `productType` is changing. In practice updates rarely
 * change `productType`.
 */
export const productUpdateSchema = z
  .object({
    name: baseProductFields.name.optional(),
    slug: baseProductFields.slug.optional(),
    description: baseProductFields.description.optional(),
    brand: baseProductFields.brand.optional(),
    category: baseProductFields.category.optional(),
    tags: baseProductFields.tags.optional(),
    images: baseProductFields.images.optional(),
    variants: baseProductFields.variants.optional(),
    featured: z.boolean().optional(),
    active: z.boolean().optional(),
    freeDelivery: z.boolean().optional(),
    isLimitedEdition: z.boolean().optional(),
    isSample: z.boolean().optional(),
    giftWrapping: z.object({ available: z.boolean(), price: z.number().nonnegative() }).optional(),
    collectionId: z.string().optional().nullable(),
    ingredients: z.array(z.string()).optional(),
    skinTypes: z.array(z.enum(['oily', 'dry', 'combination', 'sensitive', 'normal', 'all'])).optional(),
    productType: z.enum(['perfume', 'lipstick', 'makeup', 'skincare', 'jewelry', 'other']).optional(),
    attributes: z.unknown().optional(),
    seo: z.object({
      metaTitle: z.string().max(60).trim().optional(),
      metaDescription: z.string().max(160).trim().optional(),
      canonicalUrl: z.string().url('Invalid canonical URL').optional(),
    }).optional(),
    flashSale: z.object({
      active: z.boolean().optional(),
      discountPercent: z.number().min(0).max(99).optional(),
      startsAt: z.string().datetime().optional().nullable(),
      endsAt: z.string().datetime().optional().nullable(),
    }).optional(),
  })
  .strict()

/** Listing query string */
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  productType: z.enum(['perfume', 'lipstick', 'makeup', 'skincare', 'jewelry', 'other']).optional(),
  category: z.string().max(60).optional(),
  brand: z.string().max(100).optional(),
  tag: z.string().max(40).optional(),
  search: z.string().max(120).optional(),
  minPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
  maxPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
  featured: z.enum(['true', 'false']).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  isLimitedEdition: z.enum(['true', 'false']).optional(),
  isSample: z.enum(['true', 'false']).optional(),
  collectionId: z.string().optional(),
  skinType: z.string().optional(),
  sort: z
    .enum(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'oldest', 'rating', 'popular', 'relevance'])
    .default('newest'),
})

/* ─────────────────────────────────────────────────────────────
 * Cart / Order / Voucher / Review / Newsletter / Profile
 * ───────────────────────────────────────────────────────────── */

export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantSku: z.string().min(1, 'Variant SKU is required'),
  quantity: z.number().int().min(1).max(100),
})

// Strips separators, ensures leading "+", then validates E.164 format.
export const internationalPhoneSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return val
    const stripped = val.trim().replace(/[\s\-().]/g, '')
    return stripped.startsWith('+') ? stripped : `+${stripped}`
  },
  z.string().regex(
    /^\+[1-9]\d{6,14}$/,
    'Enter a valid international phone number (e.g. +923001234567)'
  )
)

export const shippingAddressSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  address: z.string().min(5).max(200).trim(),
  city: z.string().min(2).max(50).trim(),
  state: z.string().min(2).max(50).trim().optional(),
  country: z.string().min(2).max(50).trim(),
  zip: z.string().min(3).max(10).trim(),
  phone: internationalPhoneSchema,
})

export const orderSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  shippingAddress: shippingAddressSchema,
  voucherCodes: z.array(z.string().min(3).max(20)).optional(),
  idempotencyKey: z.string().optional(),
  guestEmail: z.string().email().optional(),
  shippingAmount: z.number().nonnegative().max(500).optional(),
  taxAmount: z.number().nonnegative().max(100_000).optional(),
  shippingLabel: z.string().max(80).optional(),
})

/* ─────────────────────────────────────────────────────────────
 * Admin order operations
 * ───────────────────────────────────────────────────────────── */
export const adminTrackingSchema = z.object({
  trackingNumber: z.string().trim().min(3).max(80),
  trackingCarrier: z.string().trim().min(2).max(60),
  trackingUrl: z.string().trim().url('Invalid tracking URL').max(500).optional().or(z.literal('')),
})

export const adminCancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
})

export const adminOrderListQuerySchema = z.object({
  status: z
    .enum(['pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .optional(),
  country: z.string().trim().min(2).max(60).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const voucherSchema = z.object({
  code: z.string().min(3).max(30).toUpperCase().trim().optional(),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).default(0),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime('Invalid date format').optional(),
  startsAt: z.string().datetime('Invalid date format').optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  stackable: z.boolean().default(false),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  customerIds: z.array(z.string()).optional(),
  firstOrderOnly: z.boolean().default(false),
})

export const reviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(500).trim(),
})

export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(500).trim(),
})

export const newsletterSchema = z.object({ email: emailSchema })

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^\+?[\d\s\-().]{7,30}$/, 'Invalid phone number format')
      .optional()
      .or(z.literal('')), // allow clearing
  })
  .strict()

/* ─────────────────────────────────────────────────────────────
 * Address book
 * ───────────────────────────────────────────────────────────── */
export const addressSchema = z
  .object({
    label: z.string().trim().max(30).optional().default('Home'),
    recipientName: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^\+?[\d\s\-().]{7,30}$/, 'Invalid phone number')
      .optional()
      .or(z.literal('')),
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional().or(z.literal('')),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().max(100).optional().or(z.literal('')),
    zip: z.string().trim().min(2).max(20),
    country: z.string().trim().min(2).max(60),
    isDefault: z.boolean().optional().default(false),
  })
  .strict()

export const addressUpdateSchema = addressSchema.partial().strict()

/* ─────────────────────────────────────────────────────────────
 * Review admin
 * ───────────────────────────────────────────────────────────── */
export const reviewApproveSchema = z.object({
  approved: z.boolean(),
})

/* ─────────────────────────────────────────────────────────────
 * Wishlist
 * ───────────────────────────────────────────────────────────── */
export const wishlistAddSchema = z.object({
  productId: z.string().min(1),
})

export const wishlistMoveToCartSchema = z.object({
  variantSku: z.string().min(1),
  quantity: z.number().int().min(1).max(100).default(1),
})

/* ─────────────────────────────────────────────────────────────
 * Admin — user management
 * ───────────────────────────────────────────────────────────── */
const adminPermissionSchema = z.enum([
  'all',
  'products',
  'orders',
  'reviews',
  'vouchers',
  'analytics',
  'users',
  'search-sync',
])

const adminRoleSchema = z.enum(['super_admin', 'manager', 'support'])

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  role: z.enum(['user', 'admin']).optional(),
  adminRole: adminRoleSchema.optional(),
  active: z.enum(['true', 'false']).optional(),
})

export const adminUserCreateSchema = z.object({
  email: emailSchema,
  name: z.string().min(2).max(100).trim(),
  adminRole: adminRoleSchema.default('support'),
  permissions: z.array(adminPermissionSchema).default([]),
  active: z.boolean().default(true),
})

export const adminUserPatchSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    role: z.enum(['user', 'admin']).optional(),
    adminRole: adminRoleSchema.optional(),
    permissions: z.array(adminPermissionSchema).optional(),
    active: z.boolean().optional(),
  })
  .refine((d) =>
    d.name !== undefined ||
    d.role !== undefined ||
    d.adminRole !== undefined ||
    d.permissions !== undefined ||
    d.active !== undefined,
  {
    message: 'At least one field is required',
  })
