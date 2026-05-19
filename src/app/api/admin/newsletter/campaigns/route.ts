import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { escapeRegex } from '@/lib/utils/regex'
import Newsletter from '@/models/Newsletter'
import NewsletterCampaign from '@/models/NewsletterCampaign'

const campaignQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .enum(['all', 'draft', 'scheduled', 'sending', 'sent'])
    .default('all'),
})

const campaignCreateSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  previewText: z.string().trim().max(240).optional().default(''),
  content: z.string().trim().min(1).max(100_000),
  audience: z.enum(['all', 'active', 'customers', 'vip']).default('all'),
  scheduledAt: z.string().datetime().optional(),
})

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    const params = Object.fromEntries(req.nextUrl.searchParams)
    const validation = validateData(campaignQuerySchema, params)
    if (!validation.success) return validation.response

    await connectDB()

    const { q, status } = validation.data
    const filter: Record<string, unknown> = {}
    if (status !== 'all') filter.status = status
    if (q) {
      const safe = escapeRegex(q)
      filter.$or = [
        { subject: { $regex: safe, $options: 'i' } },
        { previewText: { $regex: safe, $options: 'i' } },
      ]
    }

    const [campaigns, totalSubscribers, activeSubscribers] = await Promise.all([
      NewsletterCampaign.find(filter).sort({ createdAt: -1 }).lean(),
      Newsletter.countDocuments({}),
      Newsletter.countDocuments({ active: true }),
    ])

    return NextResponse.json({
      success: true,
      campaigns,
      subscriberCounts: {
        total: totalSubscribers,
        active: activeSubscribers,
      },
    })
  } catch (err) {
    logRouteError('GET /api/admin/newsletter/campaigns', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(campaignCreateSchema, body)
    if (!validation.success) return validation.response

    await connectDB()

    const { scheduledAt, ...data } = validation.data
    const campaign = await NewsletterCampaign.create({
      ...data,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      createdBy: admin._id,
    })

    return NextResponse.json({ success: true, campaign }, { status: 201 })
  } catch (err) {
    logRouteError('POST /api/admin/newsletter/campaigns', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
