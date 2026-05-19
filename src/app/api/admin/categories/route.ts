import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Category from '@/models/Category'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1).max(80).trim(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).toLowerCase().trim(),
  description: z.string().max(500).trim().optional(),
  image: z.string().url().optional().nullable(),
  parentId: z.string().optional().nullable(),
  productType: z.enum(['perfume', 'lipstick', 'makeup', 'jewelry', 'skincare', 'other']).optional().nullable(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

/** GET /api/admin/categories — list all (admin) */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })
    const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean()
    return NextResponse.json({ success: true, categories })
  } catch (err) {
    logRouteError('GET /api/admin/categories', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/** POST /api/admin/categories — create */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) return apiError(400, { error: 'Validation failed', details: parsed.error.flatten() })

    const exists = await Category.exists({ slug: parsed.data.slug })
    if (exists) return apiError(409, { error: 'Category slug already exists' })

    // Strip nulls (zod nullable → Mongoose String) before insert.
    const data = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== null),
    )
    const category = await Category.create(data)
    return NextResponse.json({ success: true, category }, { status: 201 })
  } catch (err) {
    logRouteError('POST /api/admin/categories', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
