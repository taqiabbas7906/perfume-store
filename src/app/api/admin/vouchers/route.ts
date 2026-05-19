import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { ordersRateLimit } from '@/lib/rateLimit'
import {
  createVoucher,
  updateVoucher,
} from '@/lib/services/voucherService'
import Voucher from '@/models/Voucher'
import { apiError, logRouteError } from '@/lib/apiError'
import { z } from 'zod'

const createVoucherSchema = z.object({
  code: z.string().optional(),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional().default(0),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().min(1).optional(),
  perUserLimit: z.number().min(1).optional(),
  expiresAt: z.string().optional(),
  startsAt: z.string().optional(),
  active: z.boolean().optional().default(true),
  stackable: z.boolean().optional().default(false),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  customerIds: z.array(z.string()).optional(),
  firstOrderOnly: z.boolean().optional().default(false),
})

const updateVoucherSchema = createVoucherSchema.partial().extend({
  voucherId: z.string(),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().min(1).nullable().optional(),
  perUserLimit: z.number().min(1).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
})

function toOptionalDate(value: string | null | undefined) {
  if (value === null) return null
  if (!value) return undefined
  return new Date(value)
}

function isDuplicateVoucherError(err: unknown) {
  if (err instanceof Error && err.message === 'Voucher code already exists') {
    return true
  }
  return (
    !!err &&
    typeof err === 'object' &&
    'code' in err &&
    err.code === 11000
  )
}

export async function GET(req: NextRequest) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const vouchers = await Voucher.find({})
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, vouchers })
  } catch (err) {
    logRouteError('GET /api/admin/vouchers', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function POST(req: NextRequest) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = createVoucherSchema.safeParse(body)
    if (!validation.success) {
      return apiError(400, {
        error: 'Invalid request',
        details: validation.error.flatten(),
      })
    }

    const data = validation.data
    const voucher = await createVoucher({
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
    })

    return NextResponse.json({ success: true, voucher }, { status: 201 })
  } catch (err) {
    if (isDuplicateVoucherError(err)) {
      return apiError(409, { error: 'Voucher code already exists' })
    }
    logRouteError('POST /api/admin/vouchers', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function PUT(req: NextRequest) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = updateVoucherSchema.safeParse(body)
    if (!validation.success) {
      return apiError(400, {
        error: 'Invalid request',
        details: validation.error.flatten(),
      })
    }

    const { voucherId, ...data } = validation.data
    const voucher = await updateVoucher({
      voucherId,
      ...data,
      expiresAt: toOptionalDate(data.expiresAt),
      startsAt: toOptionalDate(data.startsAt),
    })

    if (!voucher) {
      return apiError(404, { error: 'Voucher not found' })
    }

    return NextResponse.json({ success: true, voucher })
  } catch (err) {
    if (isDuplicateVoucherError(err)) {
      return apiError(409, { error: 'Voucher code already exists' })
    }
    logRouteError('PUT /api/admin/vouchers', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
