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
      .lean<IUser>()

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
      user,
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

    const update: Partial<Pick<IUser, 'role' | 'active'>> = {}
    if (validation.data.role !== undefined) update.role = validation.data.role
    if (validation.data.active !== undefined) update.active = validation.data.active

    const user = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: 'after' }
    )
      .select('-password -__v')
      .lean<IUser>()

    if (!user) return apiError(404, { error: 'User not found' })

    return NextResponse.json({ success: true, user })
  } catch (err) {
    logRouteError('PATCH /api/admin/users/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
