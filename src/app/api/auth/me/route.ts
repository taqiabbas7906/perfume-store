import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthUser } from '@/lib/getAuthUser'
import { getAdmin } from '@/lib/firebaseAdmin'
import { validateData } from '@/lib/validate'
import { updateProfileSchema } from '@/lib/validators'
import { updateProfileRateLimit, deleteAccountRateLimit } from '@/lib/authRateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import { logger } from '@/lib/logger'
import User from '@/models/User'
import Address from '@/models/Address'
import Order from '@/models/Order'
import Cart from '@/models/Cart'

/* ─────────────────────────────────────────────
 * Shared: safe public fields returned to client
 * ───────────────────────────────────────────── */
const PUBLIC_FIELDS = [
  '_id', 'name', 'email', 'phone', 'role',
  'hasPassword', 'emailVerified', 'createdAt',
] as const

function pickPublic(user: Record<string, unknown>) {
  return PUBLIC_FIELDS.reduce<Record<string, unknown>>((acc, f) => {
    if (user[f] !== undefined) acc[f] = user[f]
    return acc
  }, {})
}

/* ─────────────────────────────────────────────
 * GET /api/auth/me
 * ───────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return apiError(401, 'Unauthorized')
    return NextResponse.json({ success: true, user: pickPublic(user as unknown as Record<string, unknown>) })
  } catch (err) {
    logRouteError('GET /api/auth/me', err)
    return apiError(500, 'Internal server error')
  }
}

/* ─────────────────────────────────────────────
 * PUT /api/auth/me
 * Updates name and phone. Profile photos are not stored — every account
 * displays a generated initials avatar in the UI.
 *
 * JSON body: { name?, phone? }
 * ───────────────────────────────────────────── */
export async function PUT(req: NextRequest) {
  const limited = await updateProfileRateLimit(req)
  if (limited) return limited

  try {
    const user = await getAuthUser(req)
    if (!user) return apiError(401, 'Unauthorized')

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, 'Invalid JSON body')

    const name: string | undefined  = body.name
    const phone: string | undefined = body.phone

    const validation = validateData(updateProfileSchema, {
      ...(name  !== undefined && { name }),
      ...(phone !== undefined && { phone }),
    })
    if (!validation.success) return validation.response

    const updates: Record<string, unknown> = {}
    if (validation.data.name !== undefined) updates.name = validation.data.name
    if (phone !== undefined) {
      updates.phone = (validation.data.phone === '' || phone === '') ? undefined : validation.data.phone
    }

    if (Object.keys(updates).length === 0) return apiError(400, 'No updatable fields provided')

    await connectDB()
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select(PUBLIC_FIELDS.join(' ')).lean()

    if (!updated) return apiError(404, 'User not found')

    logger.info({ userId: user._id, fields: Object.keys(updates) }, 'Profile updated')
    return NextResponse.json({ success: true, user: pickPublic(updated as unknown as Record<string, unknown>) })
  } catch (err) {
    logRouteError('PUT /api/auth/me', err)
    return apiError(500, 'Internal server error')
  }
}

/* ─────────────────────────────────────────────
 * DELETE /api/auth/me  — GDPR account deletion
 *
 * Requires body: { "confirm": "DELETE" }
 *
 * What happens:
 *   1. User soft-deleted & PII anonymised in MongoDB
 *   2. Firebase Auth account deleted
 *   3. Addresses hard-deleted  (PII)
 *   4. Cart cleared
 *   5. Orders: user ref nulled, financial trail kept
 * ───────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const limited = await deleteAccountRateLimit(req)
  if (limited) return limited

  try {
    const user = await getAuthUser(req)
    if (!user) return apiError(401, 'Unauthorized')

    const body = await req.json().catch(() => null)
    if (!body || body.confirm !== 'DELETE') {
      return apiError(400, { error: 'Send { "confirm": "DELETE" } to confirm account deletion' })
    }

    await connectDB()

    /* 1. Soft-delete + anonymise */
    await User.findByIdAndUpdate(user._id, {
      $set: {
        active: false,
        deletedAt: new Date(),
        name: '[Deleted User]',
      },
      $unset: { phone: 1 },
    })

    /* 2. Firebase deletion */
    try {
      await getAdmin().auth().deleteUser(user.firebaseUid)
    } catch (fbErr) {
      logger.warn({ err: fbErr, userId: user._id }, 'Firebase deletion failed; DB already deactivated')
    }

    /* 3. Hard-delete addresses (PII) */
    await Address.deleteMany({ user: user._id })

    /* 4. Clear cart */
    await Cart.deleteMany({ user: user._id })

    /* 5. Detach orders (keep financial record, remove PII reference) */
    await Order.updateMany(
      { user: user._id },
      {
        $unset: { user: 1 },
        $set: { guestEmail: `deleted-${user._id}@deleted.local` },
      }
    )

    logger.info({ userId: user._id }, 'Account deleted (GDPR)')
    return NextResponse.json({ success: true, message: 'Your account has been permanently deleted.' })
  } catch (err) {
    logRouteError('DELETE /api/auth/me', err)
    return apiError(500, 'Internal server error')
  }
}
