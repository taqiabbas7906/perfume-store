import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Collection from '@/models/Collection'
import mongoose from 'mongoose'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).toLowerCase().trim().optional(),
  description: z.string().max(1000).trim().optional().nullable(),
  image: z.string().url().optional().nullable(),
  isLimitedEdition: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  // Partial product management
  addProducts: z.array(z.string()).optional(),
  removeProducts: z.array(z.string()).optional(),
}).strict()

export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })
    const { id } = await ctx.params
    const collection = await Collection.findById(id)
      .populate('products', 'name slug images minPrice active')
      .lean()
    if (!collection) return apiError(404, { error: 'Collection not found' })
    return NextResponse.json({ success: true, collection })
  } catch (err) {
    logRouteError('GET /api/admin/collections/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return apiError(400, { error: 'Validation failed', details: parsed.error.flatten() })

    const { addProducts, removeProducts, ...fields } = parsed.data
    const update: Record<string, unknown> = { $set: fields }

    if (addProducts?.length) {
      update.$addToSet = { products: { $each: addProducts.map(p => new mongoose.Types.ObjectId(p)) } }
    }
    if (removeProducts?.length) {
      update.$pull = { products: { $in: removeProducts.map(p => new mongoose.Types.ObjectId(p)) } }
    }

    const collection = await Collection.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true })
    if (!collection) return apiError(404, { error: 'Collection not found' })
    return NextResponse.json({ success: true, collection })
  } catch (err) {
    logRouteError('PATCH /api/admin/collections/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })
    const { id } = await ctx.params
    const collection = await Collection.findByIdAndDelete(id)
    if (!collection) return apiError(404, { error: 'Collection not found' })
    return NextResponse.json({ success: true })
  } catch (err) {
    logRouteError('DELETE /api/admin/collections/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
