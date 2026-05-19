import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import {
  adminUserCreateSchema,
  adminUserListQuerySchema,
} from '@/lib/validators'
import { escapeRegex } from '@/lib/utils/regex'
import User from '@/models/User'
import type { IUser } from '@/types'

const USER_PROJECTION = {
  name: 1,
  email: 1,
  role: 1,
  adminRole: 1,
  permissions: 1,
  active: 1,
  phone: 1,
  createdAt: 1,
  updatedAt: 1,
  lastLogin: 1,
  emailVerified: 1,
} as const

type AdminRole = NonNullable<IUser['adminRole']>
type AdminPermission = NonNullable<IUser['permissions']>[number]
type PublicUser = Omit<IUser, 'password'>

const DEFAULT_MANAGER_PERMISSIONS: AdminPermission[] = [
  'products',
  'orders',
  'reviews',
  'vouchers',
  'analytics',
]

const DEFAULT_SUPPORT_PERMISSIONS: AdminPermission[] = [
  'orders',
  'reviews',
  'vouchers',
]

function permissionsFor(role: AdminRole, permissions?: AdminPermission[]) {
  if (role === 'super_admin') return ['all'] satisfies AdminPermission[]
  if (permissions && permissions.length > 0) {
    return permissions.filter((permission) => permission !== 'all')
  }
  return role === 'manager'
    ? DEFAULT_MANAGER_PERMISSIONS
    : DEFAULT_SUPPORT_PERMISSIONS
}

function normalizeAdminRole(user: Partial<IUser>): AdminRole {
  return user.adminRole ?? 'super_admin'
}

function normalizeUser(user: PublicUser) {
  if (user.role !== 'admin') return user
  const adminRole = normalizeAdminRole(user)
  return {
    ...user,
    adminRole,
    permissions: permissionsFor(adminRole, user.permissions),
  }
}

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

    const { page, limit, q, role, adminRole, active } = validation.data

    await connectDB()

    const filter: Record<string, unknown> = {}
    const and: Record<string, unknown>[] = []

    if (role) filter.role = role
    if (active !== undefined) filter.active = active === 'true'
    if (adminRole) {
      and.push(
        adminRole === 'super_admin'
          ? { $or: [{ adminRole }, { adminRole: { $exists: false } }] }
          : { adminRole },
      )
    }

    if (q) {
      const safe = escapeRegex(q)
      and.push({
        $or: [
          { name: { $regex: safe, $options: 'i' } },
          { email: { $regex: safe, $options: 'i' } },
        ],
      })
    }

    if (and.length > 0) filter.$and = and

    const skip = (page - 1) * limit

    const adminBaseFilter = { role: 'admin' } as const
    const customerBaseFilter = { role: 'user' } as const
    const [
      total,
      users,
      totalUsers,
      activeUsers,
      adminUsers,
      customerUsers,
      superAdmins,
      managers,
      supportStaff,
    ] =
      await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select(USER_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<PublicUser[]>(),
      User.countDocuments({}),
      User.countDocuments({ active: true }),
      User.countDocuments(adminBaseFilter),
      User.countDocuments(customerBaseFilter),
      User.countDocuments({
        ...adminBaseFilter,
        $or: [{ adminRole: 'super_admin' }, { adminRole: { $exists: false } }],
      }),
      User.countDocuments({ ...adminBaseFilter, adminRole: 'manager' }),
      User.countDocuments({ ...adminBaseFilter, adminRole: 'support' }),
    ])

    return NextResponse.json({
      success: true,
      users: users.map(normalizeUser),
      counts: {
        all: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        customers: customerUsers,
        super_admin: superAdmins,
        manager: managers,
        support: supportStaff,
      },
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

/* ─────────────────────────────────────────────────────────────
 * POST /api/admin/users
 * Admin only — promote an existing signed-up account into the admin team
 * ───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(adminUserCreateSchema, body)
    if (!validation.success) return validation.response

    await connectDB()

    const { email, name, adminRole, active, permissions } = validation.data
    const existing = await User.findOne({ email }).select('_id').lean<IUser>()
    if (!existing) {
      return apiError(404, {
        error: 'User must sign up before admin access can be assigned',
      })
    }

    const user = await User.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          name,
          role: 'admin',
          adminRole,
          permissions: permissionsFor(adminRole, permissions),
          active,
        },
      },
      { returnDocument: 'after', runValidators: true },
    )
      .select(USER_PROJECTION)
      .lean<PublicUser>()

    if (!user) return apiError(404, { error: 'User not found' })

    return NextResponse.json(
      { success: true, user: normalizeUser(user) },
      { status: 201 },
    )
  } catch (err) {
    logRouteError('POST /api/admin/users', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
