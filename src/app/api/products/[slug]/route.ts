import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { productUpdateSchema } from '@/lib/validators'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'
import { syncProductToAlgolia, deleteProductFromAlgolia } from '@/lib/algolia'

type RouteContext = {
  params: Promise<{ slug: string }>
}

/* ─── GET /api/products/[slug] ───────────────────────────── */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const { slug } = await ctx.params // ✅ FIXED

  try {
    await connectDB()

    const product = await Product.findOne({ slug, active: true })
      .select('-__v')
      .lean()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, product })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))

    logger.error(
      { err: error.message, slug },
      'GET /api/products/[slug] failed'
    )

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/* ─── PUT /api/products/[slug] ───────────────────────────── */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const { slug } = await ctx.params // ✅ FIXED

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const validation = validateData(productUpdateSchema, body)
    if (!validation.success) return validation.response

    const data = validation.data

    await connectDB()

    const existing = await Product.findOne({ slug })
    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Slug uniqueness check
    if (data.slug && data.slug !== slug) {
      const clash = await Product.exists({
        slug: data.slug,
        _id: { $ne: existing._id },
      })

      if (clash) {
        return NextResponse.json(
          { error: 'A product with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // SKU uniqueness check
    if (data.variants) {
      const skuList = data.variants.map((v) => v.sku)
      const dup = skuList.filter(
        (s, i) => skuList.indexOf(s) !== i
      )

      if (dup.length) {
        return NextResponse.json(
          {
            error: `Duplicate SKU in payload: ${dup.join(', ')}`,
          },
          { status: 400 }
        )
      }

      const clash = await Product.findOne({
        _id: { $ne: existing._id },
        'variants.sku': { $in: skuList },
      })

      if (clash) {
        return NextResponse.json(
          { error: 'SKU already exists in another product' },
          { status: 409 }
        )
      }
    }

    Object.assign(existing, data)
    await existing.save()

    void syncProductToAlgolia(existing.toObject()).catch(() => {})

    return NextResponse.json({
      success: true,
      product: existing.toObject({ versionKey: false }),
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))

    logger.error(
      { err: error.message, slug },
      'PUT /api/products/[slug] failed'
    )

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/* ─── DELETE /api/products/[slug] ────────────────────────── */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const { slug } = await ctx.params // ✅ FIXED

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const product = await Product.findOneAndUpdate(
      { slug, active: true },
      { $set: { active: false } },
      { returnDocument: 'after' } // ✅ FIXED (no deprecation warning)
    )
      .select('-__v')
      .lean()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    void deleteProductFromAlgolia(String(product._id)).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Product deleted',
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))

    logger.error(
      { err: error.message, slug },
      'DELETE /api/products/[slug] failed'
    )

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}