import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Brand from '@/models/Brand'
import { z } from 'zod'

const brandSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).toLowerCase().trim(),
  description: z.string().max(1000).trim().optional(),
  logo: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  country: z.string().max(60).trim().optional(),
  isLuxury: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })
    const brands = await Brand.find({}).sort({ sortOrder: 1, name: 1 }).lean()
    return NextResponse.json({ success: true, brands })
  } catch (err) {
    logRouteError('GET /api/admin/brands', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const parsed = brandSchema.safeParse(body)
    if (!parsed.success) return apiError(400, { error: 'Validation failed', details: parsed.error.flatten() })

    const exists = await Brand.exists({ $or: [{ slug: parsed.data.slug }, { name: parsed.data.name }] })
    if (exists) return apiError(409, { error: 'Brand name or slug already exists' })

    const brand = await Brand.create(parsed.data)
    return NextResponse.json({ success: true, brand }, { status: 201 })
  } catch (err) {
    logRouteError('POST /api/admin/brands', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
