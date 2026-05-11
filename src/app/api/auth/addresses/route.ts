import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthUser } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { addressSchema } from '@/lib/validators'
import { addressRateLimit } from '@/lib/authRateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import { logger } from '@/lib/logger'
import Address from '@/models/Address'

const MAX_ADDRESSES_PER_USER = 10

/* ─────────────────────────────────────────────
 * GET /api/auth/addresses
 * Returns all addresses for the authenticated user,
 * sorted: default first, then newest.
 * ───────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await addressRateLimit(req)
  if (limited) return limited

  try {
    const user = await getAuthUser(req)
    if (!user) return apiError(401, 'Unauthorized')

    await connectDB()

    const addresses = await Address.find({ user: user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, addresses })
  } catch (err) {
    logRouteError('GET /api/auth/addresses', err)
    return apiError(500, 'Internal server error')
  }
}

/* ─────────────────────────────────────────────
 * POST /api/auth/addresses
 * Creates a new address for the authenticated user.
 * Max 10 addresses per user.
 * If isDefault=true, demotes all other addresses.
 * If this is the first address, it becomes default.
 * ───────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const limited = await addressRateLimit(req)
  if (limited) return limited

  try {
    const user = await getAuthUser(req)
    if (!user) return apiError(401, 'Unauthorized')

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, 'Invalid JSON body')

    const validation = validateData(addressSchema, body)
    if (!validation.success) return validation.response

    await connectDB()

    /* ── Enforce per-user cap ── */
    const count = await Address.countDocuments({ user: user._id })
    if (count >= MAX_ADDRESSES_PER_USER) {
      return apiError(422, {
        error: `Address book is full. Maximum ${MAX_ADDRESSES_PER_USER} addresses allowed.`,
      })
    }

    const data = validation.data
    const isFirstAddress = count === 0
    const willBeDefault  = data.isDefault || isFirstAddress

    /* ── If new default: demote existing defaults first ── */
    if (willBeDefault) {
      await Address.updateMany({ user: user._id }, { $set: { isDefault: false } })
    }

    const address = await Address.create({
      ...data,
      user: user._id,
      isDefault: willBeDefault,
    })

    logger.info({ userId: user._id, addressId: address._id }, 'Address created')
    return NextResponse.json({ success: true, address }, { status: 201 })
  } catch (err) {
    logRouteError('POST /api/auth/addresses', err)
    return apiError(500, 'Internal server error')
  }
}
