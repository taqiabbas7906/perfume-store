import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Category from '@/models/Category'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).toLowerCase().trim().optional(),
  description: z.string().max(500).trim().optional().nullable(),
  image: z.string().url().optional().nullable(),
  parentId: z.string().optional().nullable(),
  productType: z.enum(['perfume', 'lipstick', 'makeup', 'jewelry', 'skincare', 'other']).optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
}).strict()

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

    const category = await Category.findByIdAndUpdate(
      id, { $set: parsed.data }, { new: true, runValidators: true }
    )
    if (!category) return apiError(404, { error: 'Category not found' })
    return NextResponse.json({ success: true, category })
  } catch (err) {
    logRouteError('PATCH /api/admin/categories/[id]', err)
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
    const category = await Category.findByIdAndDelete(id)
    if (!category) return apiError(404, { error: 'Category not found' })
    return NextResponse.json({ success: true })
  } catch (err) {
    logRouteError('DELETE /api/admin/categories/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
