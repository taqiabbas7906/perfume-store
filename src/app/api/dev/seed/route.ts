import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import Cart from '@/models/Cart'
import Order from '@/models/Order'
import IdempotencyKey from '@/models/IdempotencyKey'
import WebhookEvent from '@/models/WebhookEvent'
import User from '@/models/User'

/**
 * Dev / test seed endpoint.
 *
 *   POST /api/dev/seed
 *
 * Wipes commerce-related collections and seeds two products with
 * variants. Available ONLY when NODE_ENV !== production. This avoids
 * the need for a separate runner script while we're iterating.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    await connectDB()

    await Promise.all([
      Cart.deleteMany({}),
      Order.deleteMany({}),
      IdempotencyKey.deleteMany({}),
      WebhookEvent.deleteMany({}),
      Product.deleteMany({}),
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

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        _id: p._id,
        slug: p.slug,
        name: p.name,
        variants: p.variants,
      })),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'seed failed', message: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  await connectDB()
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
}