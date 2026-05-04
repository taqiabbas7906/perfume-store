import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { productCreateSchema, productListQuerySchema } from '@/lib/validators'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

const PUBLIC_FIELDS =
  '-__v -variants.options._raw'

/* ─────────────────────────────────────────────────────────────
 * GET /api/products
 *
 * Query params (see `productListQuerySchema`):
 *   page, limit, productType, category, brand, tag, search,
 *   minPrice, maxPrice, featured, inStock, sort
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const url = new URL(req.url)
    const queryObject = Object.fromEntries(url.searchParams.entries())
    const validation = validateData(productListQuerySchema, queryObject)
    if (!validation.success) return validation.response
    const q = validation.data

    await connectDB()

    const filter = { active: true } as Record<string, any>
    if (q.productType) filter.productType = q.productType
    if (q.category) filter.category = q.category.toLowerCase()
    if (q.brand) filter.brand = new RegExp(`^${escapeRegex(q.brand)}$`, 'i')
    if (q.tag) filter.tags = q.tag.toLowerCase()
    if (q.featured === 'true') filter.featured = true
    if (q.inStock === 'true') filter.totalStock = { $gt: 0 }

    if (q.minPrice != null || q.maxPrice != null) {
      filter.minPrice = {} as Record<string, any>
      if (q.minPrice != null) (filter.minPrice as Record<string, any>).$gte = q.minPrice
      if (q.maxPrice != null) (filter.minPrice as Record<string, any>).$lte = q.maxPrice
    }

    let useTextScore = false
    if (q.search) {
      // Prefer full-text index for relevance; fall back to safe regex
      // to support short queries (text index requires >=2 chars indexed).
      if (q.search.trim().length >= 2) {
        filter.$text = { $search: q.search }
        useTextScore = q.sort === 'relevance'
      } else {
        const safe = escapeRegex(q.search)
        filter.$or = [
          { name: { $regex: safe, $options: 'i' } },
          { brand: { $regex: safe, $options: 'i' } },
        ]
      }
    }

    const sort = (() => {
      switch (q.sort) {
        case 'price_asc':
          return { minPrice: 1, _id: 1 }
        case 'price_desc':
          return { minPrice: -1, _id: -1 }
        case 'oldest':
          return { createdAt: 1, _id: 1 }
        case 'rating':
          return { ratingAverage: -1, ratingCount: -1, _id: -1 }
        case 'popular':
          return { ratingCount: -1, ratingAverage: -1, _id: -1 }
        case 'relevance':
          return useTextScore
            ? { score: { $meta: 'textScore' }, _id: -1 }
            : { createdAt: -1, _id: -1 }
        case 'newest':
        default:
          return { createdAt: -1, _id: -1 }
      }
    })() as unknown as Record<string, mongoose.SortOrder | { $meta: 'textScore' }>

    const skip = (q.page - 1) * q.limit

    // Use Promise.all to parallelize count + find.
    const projection = useTextScore ? { score: { $meta: 'textScore' } } : {}
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(q.limit)
        .select(PUBLIC_FIELDS)
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit) || 1,
        hasMore: q.page * q.limit < total,
      },
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error({ err: error.message }, 'GET /api/products failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ─────────────────────────────────────────────────────────────
 * POST /api/products  (admin only)
 * ───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) {
      logger.warn('Unauthorized product creation attempt')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    const validation = validateData(productCreateSchema, body)
    if (!validation.success) return validation.response
    const data = validation.data

    // Ensure no duplicate variant SKUs within the payload itself
    const skuSet = new Set<string>()
    for (const v of data.variants) {
      if (skuSet.has(v.sku)) {
        return NextResponse.json(
          { error: `Duplicate variant SKU in payload: ${v.sku}` },
          { status: 400 }
        )
      }
      skuSet.add(v.sku)
    }

    await connectDB()

    // Slug + cross-product SKU uniqueness checks
    const [slugClash, skuClash] = await Promise.all([
      Product.exists({ slug: data.slug }),
      Product.exists({ 'variants.sku': { $in: [...skuSet] } }),
    ])
    if (slugClash) {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 })
    }
    if (skuClash) {
      return NextResponse.json(
        { error: 'One or more variant SKUs already exist on another product' },
        { status: 409 }
      )
    }

    const product = await Product.create(data)
    logger.info({ productId: product._id, slug: product.slug, by: admin._id }, 'Product created')

    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error({ err: error.message }, 'POST /api/products failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}