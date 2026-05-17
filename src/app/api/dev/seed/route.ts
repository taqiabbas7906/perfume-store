import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError } from '@/lib/apiError'
import Product from '@/models/Product'
import Cart from '@/models/Cart'
import Order from '@/models/Order'
import IdempotencyKey from '@/models/IdempotencyKey'
import WebhookEvent from '@/models/WebhookEvent'
import User from '@/models/User'
import Voucher from '@/models/Voucher'
import VoucherUsage from '@/models/VoucherUsage'

/**
 * Dev / test seed endpoint.
 *
 *   POST /api/dev/seed
 *
 * Wipes commerce-related collections and seeds two products with
 * variants. Requires admin authentication.
 */
export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return apiError(404, { error: 'Not found' })
    }

    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    await Promise.all([
      Cart.deleteMany({}),
      Order.deleteMany({}),
      IdempotencyKey.deleteMany({}),
      WebhookEvent.deleteMany({}),
      Product.deleteMany({}),
      Voucher.deleteMany({}),
      VoucherUsage.deleteMany({}),
    ])

    const products = await Product.insertMany([
      {
        name: 'Aurora Vetiver',
        slug: 'aurora-vetiver',
        description:
          'A bright, modern vetiver fragrance with citrus top notes and a smoky earthen base.',
        productType: 'perfume',
        brand: 'Aurora',
        category: 'eau de parfum',
        tags: ['fresh', 'unisex', 'vetiver'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1541643600914-78b084683601',
            alt: 'Aurora bottle',
            isPrimary: true,
          },
        ],
        variants: [
          {
            sku: 'AURORA-VET-50',
            label: '50ml',
            originalPrice: 89.0,
            quantity: 25,
            options: { ml: 50 },
          },
          {
            sku: 'AURORA-VET-100',
            label: '100ml',
            originalPrice: 129.0,
            discountedPrice: 109.0,
            quantity: 10,
            options: { ml: 100 },
          },
        ],
        attributes: { concentration: 'EDP', gender: 'unisex' },
        active: true,
        featured: true,
      },
      {
        name: 'Velour Noir',
        slug: 'velour-noir',
        description:
          'A liquid matte lipstick with intense pigment and 12-hour wear.',
        productType: 'lipstick',
        brand: 'Velour',
        category: 'lipstick',
        tags: ['matte', 'long-lasting'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa',
            alt: 'Velour lipstick',
            isPrimary: true,
          },
        ],
        variants: [
          {
            sku: 'VEL-NOIR-RUBY',
            label: 'Ruby',
            originalPrice: 24.0,
            quantity: 50,
            options: { shade: 'ruby' },
          },
          {
            sku: 'VEL-NOIR-PLUM',
            label: 'Plum',
            originalPrice: 24.0,
            quantity: 3,
            options: { shade: 'plum' },
          },
        ],
        attributes: { finish: 'matte', formulation: 'liquid' },
        active: true,
      },
    ])

    const vouchers = await Voucher.insertMany([
      {
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        minOrderAmount: 0,
        firstOrderOnly: true,
        active: true,
        stackable: false,
        usedCount: 0,
      },
      {
        code: 'FIXED20',
        type: 'fixed',
        value: 20,
        minOrderAmount: 100,
        active: true,
        stackable: false,
        usedCount: 0,
      },
      {
        code: 'PERFUME15',
        type: 'percentage',
        value: 15,
        minOrderAmount: 50,
        maxDiscountAmount: 50,
        categoryIds: ['eau de parfum'],
        active: true,
        stackable: true,
        usedCount: 0,
      },
      {
        code: 'FREESHIP',
        type: 'free_shipping',
        value: 0,
        minOrderAmount: 75,
        active: true,
        stackable: false,
        usedCount: 0,
      },
    ])

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        _id: p._id,
        slug: p.slug,
        name: p.name,
        variants: p.variants,
      })),
      vouchers: vouchers.map((v) => ({
        _id: v._id,
        code: v.code,
        type: v.type,
        value: v.value,
      })),
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'seed failed',
        ...(process.env.NODE_ENV !== 'production'
          ? { message: (err as Error).message }
          : {}),
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return apiError(404, { error: 'Not found' })
    }

    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const products = await Product.find({}, { name: 1, slug: 1, variants: 1 })
      .lean()
    const orders = await Order.countDocuments()
    const carts = await Cart.countDocuments()
    const users = await User.countDocuments()
    const idem = await IdempotencyKey.countDocuments()
    const wh = await WebhookEvent.countDocuments()
    return NextResponse.json({
      ok: true,
      products,
      counters: { orders, carts, users, idempotencyKeys: idem, webhooks: wh },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'failed to get seed status',
        ...(process.env.NODE_ENV !== 'production'
          ? { message: (err as Error).message }
          : {}),
      },
      { status: 500 }
    )
  }
}
