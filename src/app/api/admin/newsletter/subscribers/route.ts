import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { escapeRegex } from '@/lib/utils/regex'
import Newsletter from '@/models/Newsletter'
import User from '@/models/User'

const subscribersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(['all', 'active', 'unsubscribed']).default('all'),
})

function nameFromEmail(email: string) {
  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    const params = Object.fromEntries(req.nextUrl.searchParams)
    const validation = validateData(subscribersQuerySchema, params)
    if (!validation.success) return validation.response

    await connectDB()

    const { q, status } = validation.data
    const filter: Record<string, unknown> = {}

    if (status === 'active') filter.active = true
    if (status === 'unsubscribed') filter.active = false
    if (q) {
      filter.email = { $regex: escapeRegex(q), $options: 'i' }
    }

    const [subscribers, total, active, unsubscribed] = await Promise.all([
      Newsletter.find(filter).sort({ subscribedAt: -1 }).lean(),
      Newsletter.countDocuments({}),
      Newsletter.countDocuments({ active: true }),
      Newsletter.countDocuments({ active: false }),
    ])

    const emails = subscribers.map((subscriber) => subscriber.email)
    const users = await User.find({ email: { $in: emails } })
      .select('name email')
      .lean<{ name?: string; email: string }[]>()
    const userByEmail = new Map(
      users.map((user) => [user.email.toLowerCase(), user.name]),
    )

    return NextResponse.json({
      success: true,
      subscribers: subscribers.map((subscriber) => ({
        _id: subscriber._id,
        email: subscriber.email,
        name: userByEmail.get(subscriber.email) ?? nameFromEmail(subscriber.email),
        status: subscriber.active ? 'active' : 'unsubscribed',
        subscribedAt: subscriber.subscribedAt,
      })),
      counts: {
        total,
        active,
        unsubscribed,
      },
    })
  } catch (err) {
    logRouteError('GET /api/admin/newsletter/subscribers', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
