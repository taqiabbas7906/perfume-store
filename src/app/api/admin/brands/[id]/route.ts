import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Brand from '@/models/Brand'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).toLowerCase().trim().optional(),
  description: z.string().max(1000).trim().optional().nullable(),
  logo: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  country: z.string().max(60).trim().optional(),
  isLuxury: z.boolean().optional(),
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

    const brand = await Brand.findByIdAndUpdate(
      id, { $set: parsed.data }, { new: true, runValidators: true }
    )
    if (!brand) return apiError(404, { error: 'Brand not found' })
    return NextResponse.json({ success: true, brand })
  } catch (err) {
    logRouteError('PATCH /api/admin/brands/[id]', err)
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
    const brand = await Brand.findByIdAndDelete(id)
    if (!brand) return apiError(404, { error: 'Brand not found' })
    return NextResponse.json({ success: true })
  } catch (err) {
    logRouteError('DELETE /api/admin/brands/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
