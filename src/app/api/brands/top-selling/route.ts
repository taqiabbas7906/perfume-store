import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import Order from '@/models/Order'
import Brand from '@/models/Brand'
import Product from '@/models/Product'
import { REVENUE_STATUSES } from '@/lib/constants'

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * GET /api/brands/top-selling
 *
 * Brand strings are stored directly on each product (free-form during
 * product creation), so they are the source of truth here. The flow:
 *
 *   1. Pull every distinct brand from active products. These are the brands
 *      the storefront actually has stock for, so every result is shoppable.
 *   2. Aggregate units sold per brand from paid orders within the window.
 *   3. Optionally enrich each row with logo/slug from the curated `Brand`
 *      collection when a matching record exists — but we never gate results
 *      on it.
 *   4. Sort: brands with sales first (desc by units), then everything else
 *      alphabetically so the bento tail stays predictable.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()

    const sp = req.nextUrl.searchParams
    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '8', 10) || 8, 1), 24)
    const days = Math.min(Math.max(parseInt(sp.get('days') ?? '180', 10) || 180, 1), 365)

    const since = new Date()
    since.setDate(since.getDate() - days)

    /* 1) Gather candidate brand names from both sources so the bento shows:
     *    - every active Brand the admin has created (even without products yet)
     *    - every brand string that products actually use (even without a
     *      curated Brand record)
     *    The two are merged case-insensitively, preferring Brand-record casing
     *    so the admin's chosen capitalisation always wins. */
    const [brandDocsForCatalog, distinctRaw] = await Promise.all([
      Brand.find({ active: true })
        .select('name slug logo description country sortOrder')
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      Product.distinct('brand', { active: true }) as Promise<unknown[]>,
    ])

    const productBrandNames = distinctRaw
      .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
      .map((b) => b.trim())

    const nameByLower = new Map<string, string>()
    for (const doc of brandDocsForCatalog) {
      nameByLower.set(doc.name.toLowerCase(), doc.name)
    }
    for (const n of productBrandNames) {
      if (!nameByLower.has(n.toLowerCase())) nameByLower.set(n.toLowerCase(), n)
    }
    const brandNames = Array.from(nameByLower.values())

    if (brandNames.length === 0) {
      return NextResponse.json({ success: true, windowDays: days, brands: [] })
    }

    /* 2) Units sold per brand in the window. Grouping is case-insensitive
     *    so "Tom Ford" and "tom ford" roll up into the same bucket — but
     *    we keep the canonical casing from `brandNames` in the response. */
    const sales = await Order.aggregate<{
      _id: string
      units: number
      revenue: number
    }>([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
          pipeline: [{ $project: { brand: 1 } }],
        },
      },
      {
        $addFields: {
          brand: { $arrayElemAt: ['$product.brand', 0] },
        },
      },
      { $match: { brand: { $type: 'string', $ne: '' } } },
      {
        $group: {
          _id: { $toLower: '$brand' },
          units: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
        },
      },
    ])
    const salesByLower = new Map(sales.map((s) => [s._id, s]))

    /* 3) Index Brand documents by lower-cased name for logo enrichment. */
    const docByLower = new Map(
      brandDocsForCatalog.map((b) => [b.name.toLowerCase(), b]),
    )

    /* 4) Build, sort, slice. */
    const enriched = brandNames.map((name) => {
      const lower = name.toLowerCase()
      const sale = salesByLower.get(lower)
      const doc = docByLower.get(lower)
      return {
        _id: doc?._id?.toString() ?? name,
        name: doc?.name ?? name, // prefer the casing the admin set on the Brand doc
        slug: doc?.slug ?? slugify(name),
        logo: doc?.logo,
        description: doc?.description,
        country: doc?.country,
        units: sale?.units ?? 0,
        revenue: sale ? Math.round(sale.revenue * 100) / 100 : 0,
      }
    })

    enriched.sort((a, b) => {
      if (b.units !== a.units) return b.units - a.units
      if (b.revenue !== a.revenue) return b.revenue - a.revenue
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      windowDays: days,
      brands: enriched.slice(0, limit),
    })
  } catch (err) {
    logRouteError('GET /api/brands/top-selling', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
