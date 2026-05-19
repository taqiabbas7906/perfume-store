import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import { escapeRegex } from '@/lib/utils/regex'

/**
 * GET /api/admin/products
 *
 * Admin product listing — unlike /api/products (which hard-codes active: true),
 * this returns ALL products so admins can manage inactive/soft-deleted items.
 *
 * Query params:
 *   search?  free-text on name/brand/slug
 *   brand?   exact brand match
 *   status?  'active' | 'inactive' (omit for both)
 *   page, limit
 */
const adminProductListSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().max(120).optional(),
  brand: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const params = Object.fromEntries(new URL(req.url).searchParams.entries())
    const validation = validateData(adminProductListSchema, params)
    if (!validation.success) return validation.response

    const { page, limit, search, brand, status } = validation.data
    const filter: Record<string, unknown> = {}

    if (status === 'active') filter.active = true
    else if (status === 'inactive') filter.active = false

    if (brand) {
      filter.brand = { $regex: `^${escapeRegex(brand)}$`, $options: 'i' }
    }

    if (search?.trim()) {
      const safe = escapeRegex(search.trim())
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { brand: { $regex: safe, $options: 'i' } },
        { slug: { $regex: safe, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    logRouteError('GET /api/admin/products', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
