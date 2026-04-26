import { z } from 'zod'

// Email validator
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()

// Password validator
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password is too long')

// Register validator
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name is too long')
    .trim(),
})

// Login validator
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

// Product validator
export const productSchema = z.object({
  name: z
    .string()
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name is too long')
    .trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug is too long')
    .toLowerCase()
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description is too long')
    .trim(),
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(100000, 'Price is too high'),
  category: z.enum(['men', 'women', 'unisex']),
  quantity: z
    .number()
    .min(0, 'Quantity cannot be negative')
    .int('Quantity must be a whole number'),
  brand: z
    .string()
    .min(2, 'Brand must be at least 2 characters')
    .max(50, 'Brand is too long')
    .trim(),
  sizes: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
})

// Cart item validator
export const cartItemSchema = z.object({
  productId: z
    .string()
    .min(1, 'Product ID is required'),
  quantity: z
    .number()
    .min(1, 'Quantity must be at least 1')
    .int('Quantity must be a whole number'),
})

// Shipping address validator
export const shippingAddressSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name is too long')
    .trim(),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address is too long')
    .trim(),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City is too long')
    .trim(),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country is too long')
    .trim(),
  zip: z
    .string()
    .min(3, 'ZIP code must be at least 3 characters')
    .max(10, 'ZIP code is too long')
    .trim(),
})

// Order validator
export const orderSchema = z.object({
  items: z
    .array(cartItemSchema)
    .min(1, 'Order must have at least one item'),
  shippingAddress: shippingAddressSchema,
  voucherCode: z.string().optional(),
})

// Voucher validator
export const voucherSchema = z.object({
  code: z
    .string()
    .min(3, 'Voucher code must be at least 3 characters')
    .max(20, 'Voucher code is too long')
    .toUpperCase()
    .trim(),
  type: z.enum(['percentage', 'fixed']),
  value: z
    .number()
    .min(1, 'Value must be at least 1')
    .max(100, 'Percentage cannot exceed 100'),
  minOrderAmount: z.number().min(0).default(0),
  usageLimit: z
    .number()
    .min(1, 'Usage limit must be at least 1')
    .int('Usage limit must be a whole number'),
  expiresAt: z.string().datetime('Invalid date format'),
  active: z.boolean().default(true),
})

// Review validator
export const reviewSchema = z.object({
  productId: z
    .string()
    .min(1, 'Product ID is required'),
  orderId: z
    .string()
    .min(1, 'Order ID is required'),
  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5')
    .int('Rating must be a whole number'),
  comment: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(500, 'Review is too long')
    .trim(),
})

// Newsletter validator
export const newsletterSchema = z.object({
  email: emailSchema,
})

// Update profile validator
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name is too long')
    .trim()
    .optional(),
  image: z
    .string()
    .url('Invalid image URL')
    .optional(),
})

// Change password validator
export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  )