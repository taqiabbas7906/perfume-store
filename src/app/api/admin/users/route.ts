import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { adminUserListQuerySchema } from '@/lib/validators'
import User from '@/models/User'

const USER_PROJECTION = {
  name: 1,
  email: 1,
  role: 1,
  active: 1,
  phone: 1,
  createdAt: 1,
  lastLogin: 1,
  emailVerified: 1,
} as const

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/users
 * Admin only — paginated user list with search + filters
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    const url = new URL(req.url)
    const validation = validateData(
      adminUserListQuerySchema,
      Object.fromEntries(url.searchParams)
    )
    if (!validation.success) return validation.response

    const { page, limit, q, role, active } = validation.data

    await connectDB()

    const filter: Record<string, unknown> = {}

    if (role) filter.role = role
    if (active !== undefined) filter.active = active === 'true'

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select(USER_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    logRouteError('GET /api/admin/users', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
