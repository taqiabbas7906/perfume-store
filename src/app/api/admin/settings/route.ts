import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Settings, { SETTINGS_SINGLETON_KEY, getSettings } from '@/models/Settings'

const updateSchema = z
  .object({
    freeDelivery: z
      .object({
        enabled: z.boolean(),
        threshold: z.number().nonnegative().max(1_000_000).default(0),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one settings group is required',
  })

/** GET — same shape as the public endpoint, used by the admin form. */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const s = await getSettings()
    return NextResponse.json({
      success: true,
      settings: {
        freeDelivery: {
          enabled: !!s.freeDelivery?.enabled,
          threshold: s.freeDelivery?.threshold ?? 0,
        },
      },
    })
  } catch (err) {
    logRouteError('GET /api/admin/settings', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/** PATCH — partial update of the singleton doc. */
export async function PATCH(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(400, {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      })
    }

    const update: Record<string, unknown> = {}
    if (parsed.data.freeDelivery) {
      update['freeDelivery.enabled'] = parsed.data.freeDelivery.enabled
      update['freeDelivery.threshold'] = parsed.data.freeDelivery.threshold
    }

    const doc = await Settings.findOneAndUpdate(
      { key: SETTINGS_SINGLETON_KEY },
      { $set: update, $setOnInsert: { key: SETTINGS_SINGLETON_KEY } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean()

    return NextResponse.json({
      success: true,
      settings: {
        freeDelivery: {
          enabled: !!doc?.freeDelivery?.enabled,
          threshold: doc?.freeDelivery?.threshold ?? 0,
        },
      },
    })
  } catch (err) {
    logRouteError('PATCH /api/admin/settings', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
