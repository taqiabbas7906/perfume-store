import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthUser } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { addressUpdateSchema } from '@/lib/validators'
import { addressRateLimit } from '@/lib/authRateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import { logger } from '@/lib/logger'
import Address from '@/models/Address'
import { Types } from 'mongoose'

type Ctx = { params: Promise<{ id: string }> }

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id
}

/* ─────────────────────────────────────────────
 * GET /api/auth/addresses/[id]
 * Returns a single address owned by the user.
 * ───────────────────────────────────────────── */
export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await addressRateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!isValidObjectId(id)) return apiError(400, 'Invalid address ID')

    const user = await getAuthUser(req)
    if (!user) return apiError(401, 'Unauthorized')

    await connectDB()

    const address = await Address.findOne({ _id: id, user: user._id }).lean()
    if (!address) return apiError(404, 'Address not found')

    return NextResponse.json({ success: true, address })
  } catch (err) {
    logRouteError('GET /api/auth/addresses/[id]', err)
    return apiError(500, 'Internal server error')
  }
}

/* ─────────────────────────────────────────────
 * PUT /api/auth/addresses/[id]
 * Partial update. If isDefault is set to true,
 * all other addresses are demoted first.
 * ───────────────────────────────────────────── */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const limited = await addressRateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!isValidObjectId(id)) return apiError(400, 'Invalid address ID')

    const user = await getAuthUser(req)
    if (!user) return apiError(401, 'Unauthorized')

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, 'Invalid JSON body')

    const validation = validateData(addressUpdateSchema, body)
    if (!validation.success) return validation.response

    if (Object.keys(validation.data).length === 0) {
      return apiError(400, 'No updatable fields provided')
    }

    await connectDB()

    /* ── Confirm ownership before writing ── */
    const existing = await Address.findOne({ _id: id, user: user._id })
    if (!existing) return apiError(404, 'Address not found')

    /* ── If promoting to default, demote others first ── */
    if (validation.data.isDefault === true) {
      await Address.updateMany(
        { user: user._id, _id: { $ne: id } },
        { $set: { isDefault: false } }
      )
    }

    const updated = await Address.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).lean()

    logger.info({ userId: user._id, addressId: id }, 'Address updated')
    return NextResponse.json({ success: true, address: updated })
  } catch (err) {
    logRouteError('PUT /api/auth/addresses/[id]', err)
    return apiError(500, 'Internal server error')
  }
}

/* ─────────────────────────────────────────────
 * DELETE /api/auth/addresses/[id]
 * Deletes the address. If it was the default,
 * the next most-recent address is promoted.
 * ───────────────────────────────────────────── */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const limited = await addressRateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!isValidObjectId(id)) return apiError(400, 'Invalid address ID')

    const user = await getAuthUser(req)
    if (!user) return apiError(401, 'Unauthorized')

    await connectDB()

    const address = await Address.findOneAndDelete({ _id: id, user: user._id })
    if (!address) return apiError(404, 'Address not found')

    /* ── Promote the next address to default if deleted one was default ── */
    if (address.isDefault) {
      const next = await Address.findOne({ user: user._id }).sort({ createdAt: -1 })
      if (next) {
        await Address.findByIdAndUpdate(next._id, { $set: { isDefault: true } })
      }
    }

    logger.info({ userId: user._id, addressId: id }, 'Address deleted')
    return NextResponse.json({ success: true, message: 'Address deleted' })
  } catch (err) {
    logRouteError('DELETE /api/auth/addresses/[id]', err)
    return apiError(500, 'Internal server error')
  }
}
