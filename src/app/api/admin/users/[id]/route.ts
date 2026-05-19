import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { adminUserPatchSchema } from '@/lib/validators'
import User from '@/models/User'
import Order from '@/models/Order'
import Review from '@/models/Review'
import mongoose from 'mongoose'
import type { IUser } from '@/types'

type Ctx = { params: Promise<{ id: string }> }
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
 * GET /api/admin/users/[id]
 * Admin only — full user profile + activity summary
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) return apiError(400, { error: 'Invalid id' })

    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const user = await User.findById(id)
      .select('-password -__v')
      .lean<PublicUser>()

    if (!user) return apiError(404, { error: 'User not found' })

    const uid = new mongoose.Types.ObjectId(id)

    const [orderCount, reviewCount, recentOrders] = await Promise.all([
      Order.countDocuments({ user: uid }),
      Review.countDocuments({ user: uid }),
      Order.find({ user: uid })
        .select('status totalAmount createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      user: normalizeUser(user),
      stats: { orderCount, reviewCount },
      recentOrders,
    })
  } catch (err) {
    logRouteError('GET /api/admin/users/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/* ─────────────────────────────────────────────────────────────
 * PATCH /api/admin/users/[id]
 * Admin only — change role or ban/unban.
 * An admin cannot modify their own account here.
 * ───────────────────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) return apiError(400, { error: 'Invalid id' })

    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    if (admin._id.toString() === id) {
      return apiError(400, { error: 'You cannot modify your own account here' })
    }

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(adminUserPatchSchema, body)
    if (!validation.success) return validation.response

    await connectDB()

    const existing = await User.findById(id)
      .select('role adminRole permissions')
      .lean<IUser>()

    if (!existing) return apiError(404, { error: 'User not found' })

    const update: Record<string, unknown> = {}
    const unset: Record<string, ''> = {}
    if (validation.data.name !== undefined) update.name = validation.data.name
    if (validation.data.active !== undefined) update.active = validation.data.active

    if (validation.data.role === 'user') {
      update.role = 'user'
      unset.adminRole = ''
      unset.permissions = ''
    } else if (
      validation.data.role === 'admin' ||
      validation.data.adminRole !== undefined ||
      validation.data.permissions !== undefined
    ) {
      const adminRole =
        validation.data.adminRole ??
        (existing.role === 'admin' ? normalizeAdminRole(existing) : 'manager')
      update.role = 'admin'
      update.adminRole = adminRole
      update.permissions = permissionsFor(adminRole, validation.data.permissions)
    }

    const patch: Record<string, Record<string, unknown>> = {}
    if (Object.keys(update).length > 0) patch.$set = update
    if (Object.keys(unset).length > 0) patch.$unset = unset

    const user = await User.findByIdAndUpdate(
      id,
      patch,
      { returnDocument: 'after', runValidators: true }
    )
      .select('-password -__v')
      .lean<PublicUser>()

    if (!user) return apiError(404, { error: 'User not found' })

    return NextResponse.json({ success: true, user: normalizeUser(user) })
  } catch (err) {
    logRouteError('PATCH /api/admin/users/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
