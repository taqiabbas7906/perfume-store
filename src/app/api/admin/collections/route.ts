import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Collection from '@/models/Collection'
import mongoose from 'mongoose'
import { z } from 'zod'

const collectionSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).toLowerCase().trim(),
  description: z.string().max(1000).trim().optional(),
  image: z.string().url().optional().nullable(),
  products: z.array(z.string()).default([]),
  isLimitedEdition: z.boolean().default(false),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
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
    const { searchParams } = new URL(req.url)
    const populate = searchParams.get('populate') === 'true'

    let query = Collection.find({}).sort({ sortOrder: 1, name: 1 })
    if (populate) {
      query = query.populate('products', 'name slug images minPrice active') as any
    }
    const collections = await query.lean()
    return NextResponse.json({ success: true, collections })
  } catch (err) {
    logRouteError('GET /api/admin/collections', err)
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

    const parsed = collectionSchema.safeParse(body)
    if (!parsed.success) return apiError(400, { error: 'Validation failed', details: parsed.error.flatten() })

    const exists = await Collection.exists({ slug: parsed.data.slug })
    if (exists) return apiError(409, { error: 'Collection slug already exists' })

    const data = {
      ...parsed.data,
      products: parsed.data.products.map(id => new mongoose.Types.ObjectId(id)),
    }

    const collection = await Collection.create(data)
    return NextResponse.json({ success: true, collection }, { status: 201 })
  } catch (err) {
    logRouteError('POST /api/admin/collections', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
