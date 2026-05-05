import { z } from 'zod'

/**
 * Cart / Order / Payment Zod schemas (PRODUCTION SAFE)
 */

const skuRegex = /^[A-Za-z0-9._-]+$/
const objectIdRegex = /^[0-9a-fA-F]{24}$/
const idempotencyKeyRegex = /^[A-Za-z0-9_\-:.]{8,128}$/

/* ───────────────────────────────────────────── */
/* CART */
/* ───────────────────────────────────────────── */

export const cartAddItemSchema = z
  .object({
    productId: z.string().regex(objectIdRegex, 'Invalid product id'),
    variantSku: z.string().min(3).max(64).regex(skuRegex, 'Invalid SKU format'),
    quantity: z.number().int().min(1).max(100),
  })
  .strict()

export const cartUpdateItemSchema = z
  .object({
    quantity: z.number().int().min(0).max(100),
  })
  .strict()

/* ───────────────────────────────────────────── */
/* SHIPPING */
/* ───────────────────────────────────────────── */

export const shippingAddressSchema = z
  .object({
    name: z.string().min(2).max(80).trim(),
    address: z.string().min(5).max(200).trim(),
    city: z.string().min(2).max(80).trim(),
    country: z.string().min(2).max(80).trim(),
    zip: z.string().min(2).max(20).trim(),
  })
  .strict()

/* ───────────────────────────────────────────── */
/* ORDER */
/* ───────────────────────────────────────────── */

export const orderCreateSchema = z
  .object({
    shippingAddress: shippingAddressSchema,

    voucherCode: z.string().min(3).max(20).optional(),

    idempotencyKey: z
      .string()
      .regex(idempotencyKeyRegex, 'Invalid idempotency key format')
      .optional(),

    buyNow: z
      .object({
        productId: z.string().regex(objectIdRegex),
        variantSku: z.string().regex(skuRegex),
        quantity: z.number().int().min(1).max(100),
      })
      .strict()
      .optional(),
  })
  .strict()

/* ───────────────────────────────────────────── */
/* PAYMENT */
/* ───────────────────────────────────────────── */

export const paymentCreateSchema = z
  .object({
    orderId: z.string().regex(objectIdRegex, 'Invalid order id'),

    sourceId: z.string().min(1).max(256),

    idempotencyKey: z
      .string()
      .regex(idempotencyKeyRegex, 'Invalid idempotency key format')
      .optional(),

    verificationToken: z.string().max(2048).optional(),
  })
  .strict()

/* ───────────────────────────────────────────── */
/* TYPES */
/* ───────────────────────────────────────────── */

export type CartAddItemInput = z.infer<typeof cartAddItemSchema>
export type CartUpdateItemInput = z.infer<typeof cartUpdateItemSchema>
export type OrderCreateInput = z.infer<typeof orderCreateSchema>
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>