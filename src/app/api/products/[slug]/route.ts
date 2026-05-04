import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import {
  productCreateSchema,
  productUpdateSchema,
} from '@/lib/validators'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'

type RouteContext = { params: Promise<{ slug: string }> }

/* ─── GET /api/products/[slug] ────────────────────────────────── */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const { slug } = await ctx.params
  try {
    await connectDB()
    const product = await Product.findOne({ slug, active: true })
      .select('-__v')
      .lean()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, product })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error({ err: error.message, slug }, 'GET /api/products/[slug] failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ─── PUT /api/products/[slug]  (admin) ───────────────────────── */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const { slug } = await ctx.params
  try {
    const admin = await getAuthAdmin(req)
    if (!admin) {
      logger.warn({ slug }, 'Unauthorized product update attempt')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    const partial = validateData(productUpdateSchema, body)
    if (!partial.success) return partial.response
    const data = partial.data

    await connectDB()
    const existing = await Product.findOne({ slug })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Slug uniqueness if it's being changed
    if (data.slug && data.slug !== slug) {
      const clash = await Product.exists({ slug: data.slug, _id: { $ne: existing._id } })
      if (clash) {
        return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 })
      }
    }

    // SKU uniqueness across products
    if (data.variants) {
      const skuList = data.variants.map((v) => v.sku)
      const dupInPayload = skuList.filter((s, i) => skuList.indexOf(s) !== i)
      if (dupInPayload.length) {
        return NextResponse.json(
          { error: `Duplicate variant SKU in payload: ${dupInPayload.join(', ')}` },
          { status: 400 }
        )
      }
      const clash = await Product.findOne({
        _id: { $ne: existing._id },
        'variants.sku': { $in: skuList },
      })
        .select({ _id: 1 })
        .lean()
      if (clash) {
        return NextResponse.json(
          { error: 'One or more variant SKUs already exist on another product' },
          { status: 409 }
        )
      }
    }

    // If productType OR attributes is being updated, re-validate against the
    // strict creation schema for that type so we never store invalid attrs.
    if (data.productType || data.attributes !== undefined) {
      const merged = {
        productType: data.productType ?? existing.productType,
        attributes: data.attributes ?? existing.attributes,
        // Inject required base fields with current values to satisfy validator.
        name: data.name ?? existing.name,
        slug: data.slug ?? existing.slug,
        description: data.description ?? existing.description,
        brand: data.brand ?? existing.brand,
        category: data.category ?? existing.category,
        tags: data.tags ?? existing.tags ?? [],
        images: data.images ?? existing.images ?? [],
        variants: data.variants ?? existing.variants,
        featured: data.featured ?? existing.featured,
        active: data.active ?? existing.active,
      }
      const fullCheck = productCreateSchema.safeParse(merged)
      if (!fullCheck.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: fullCheck.error.flatten().fieldErrors },
          { status: 400 }
        )
      }
    }

    Object.assign(existing, data)
    await existing.save() // triggers pre-save hook -> recompute aggregates
    logger.info({ productId: existing._id, slug, by: admin._id }, 'Product updated')

    return NextResponse.json({ success: true, product: existing.toObject({ versionKey: false }) })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error({ err: error.message, slug }, 'PUT /api/products/[slug] failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ─── DELETE /api/products/[slug]  (soft delete, admin) ───────── */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const { slug } = await ctx.params
  try {
    const admin = await getAuthAdmin(req)
    if (!admin) {
      logger.warn({ slug }, 'Unauthorized product delete attempt')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const product = await Product.findOneAndUpdate(
      { slug, active: true },
      { $set: { active: false } },
      { new: true }
    )
      .select('-__v')
      .lean()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    logger.info({ slug, by: admin._id }, 'Product soft-deleted')
    return NextResponse.json({ success: true, message: 'Product deleted' })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error({ err: error.message, slug }, 'DELETE /api/products/[slug] failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}