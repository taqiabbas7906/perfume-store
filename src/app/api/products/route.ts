import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { productCreateSchema, productListQuerySchema } from '@/lib/validators'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { syncProductToAlgolia } from '@/lib/algolia'
import { escapeRegex } from '@/lib/utils/regex'

const PUBLIC_FIELDS = '-__v -variants.options._raw'

/* ─────────────────────────────────────────────
 * GET PRODUCTS
 * ───────────────────────────────────────────── */
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

    const filter: Record<string, unknown> & { minPrice?: Record<string, number> } = { active: true }

    if (q.productType) filter.productType = q.productType
    if (q.category) filter.category = q.category.toLowerCase()
    if (q.brand) filter.brand = new RegExp(`^${escapeRegex(q.brand)}$`, 'i')
    if (q.tag) {
      const lowerTag = q.tag.toLowerCase()
      // For audience filters (men/women/unisex) the storefront uses the
      // same `tag` query param, but admin-created perfumes store the value
      // under `attributes.gender` rather than the `tags` array. Match
      // either so both data shapes work.
      if (lowerTag === 'men' || lowerTag === 'women' || lowerTag === 'unisex') {
        const audienceClause = {
          $or: [{ tags: lowerTag }, { 'attributes.gender': lowerTag }],
        }
        const existing = (filter.$and as object[] | undefined) ?? []
        filter.$and = [...existing, audienceClause]
      } else {
        filter.tags = lowerTag
      }
    }
    if (q.featured === 'true') filter.featured = true
    if (q.inStock === 'true') filter.totalStock = { $gt: 0 }
    if (q.isLimitedEdition === 'true') filter.isLimitedEdition = true
    if (q.isSample === 'true') filter.isSample = true
    if (q.collectionId) filter.collectionId = q.collectionId
    if (q.skinType) filter.skinTypes = q.skinType

    /* ─────────────────────────────────────────────
     * FIXED PRICE FILTER (correct + safe)
     * ───────────────────────────────────────────── */
    if (q.minPrice != null || q.maxPrice != null) {
      filter.minPrice = {}

      if (q.minPrice != null) {
        filter.minPrice.$gte = Number(q.minPrice)
      }

      if (q.maxPrice != null) {
        filter.minPrice.$lte = Number(q.maxPrice)
      }
    }

    let useTextScore = false

    /* ─────────────────────────────────────────────
     * SEARCH
     * ───────────────────────────────────────────── */
    if (q.search) {
      const search = q.search.trim()

      if (search.length >= 2) {
        filter.$text = { $search: search }
        useTextScore = q.sort === 'relevance'
      } else {
        const safe = escapeRegex(search)
        filter.$or = [
          { name: { $regex: safe, $options: 'i' } },
          { brand: { $regex: safe, $options: 'i' } },
          { tags: { $regex: safe, $options: 'i' } },
        ]
      }
    }

    /* ─────────────────────────────────────────────
     * SORTING
     * ───────────────────────────────────────────── */
    const sort = (() => {
      switch (q.sort) {
        case 'price_asc':
          return { minPrice: 1, _id: 1 }

        case 'price_desc':
          return { minPrice: -1, _id: -1 }

        case 'name_asc':
          return { name: 1, _id: 1 }

        case 'name_desc':
          return { name: -1, _id: -1 }

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

        default:
          return { createdAt: -1, _id: -1 }
      }
    })()

    const skip = (q.page - 1) * q.limit
    const projection = useTextScore ? { score: { $meta: 'textScore' } } : {}

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter, projection)
        .sort(sort as any)
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/* ─────────────────────────────────────────────
 * CREATE PRODUCT
 * ───────────────────────────────────────────── */
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

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const validation = validateData(productCreateSchema, body)
    if (!validation.success) return validation.response

    const data = validation.data

    /* ─────────────────────────────────────────────
     * SKU VALIDATION (critical for your system)
     * ───────────────────────────────────────────── */
    const skuSet = new Set<string>()

    for (const v of data.variants) {
      if (skuSet.has(v.sku)) {
        return NextResponse.json(
          { error: `Duplicate SKU in request: ${v.sku}` },
          { status: 400 }
        )
      }

      skuSet.add(v.sku)
    }

    await connectDB()

    /* ─────────────────────────────────────────────
     * DUPLICATE CHECKS
     * ───────────────────────────────────────────── */
    const [slugClash, skuClash] = await Promise.all([
      Product.exists({ slug: data.slug }),
      Product.exists({ 'variants.sku': { $in: [...skuSet] } }),
    ])

    if (slugClash) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 409 }
      )
    }

    if (skuClash) {
      return NextResponse.json(
        { error: 'One or more SKUs already exist in another product' },
        { status: 409 }
      )
    }

    /* ─────────────────────────────────────────────
     * CREATE PRODUCT
     * ───────────────────────────────────────────── */
    const product = await Product.create(data)

    void syncProductToAlgolia(product.toObject()).catch(() => {})

    logger.info(
      {
        productId: product._id,
        slug: product.slug,
        by: admin._id,
        skuCount: data.variants.length,
      },
      'Product created'
    )

    return NextResponse.json(
      { success: true, product },
      { status: 201 }
    )
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))

    logger.error({ err: error.message }, 'POST /api/products failed')

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

