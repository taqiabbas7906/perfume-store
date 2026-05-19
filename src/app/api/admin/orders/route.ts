import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import Order from '@/models/Order'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { adminOrderListQuerySchema } from '@/lib/validators'
import { escapeRegex } from '@/lib/utils/regex'
import type { OrderStatus } from '@/types'

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'failed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

/**
 * GET /api/admin/orders
 * Filterable order listing for admin dashboard.
 *
 * Query params:
 *   status?     OrderStatus
 *   country?    ISO country code or full name (matched against shippingAddress.country)
 *   startDate?  ISO datetime â€” orders created on/after
 *   endDate?    ISO datetime â€” orders created on/before
 *   q?          free-text search (order id suffix, customer email, tracking number)
 *   page, limit pagination
 */
export async function GET(req: NextRequest) {
  const limited = await ordersRateLimit(req, { failClosed: true })
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const params = Object.fromEntries(new URL(req.url).searchParams.entries())
    const validation = validateData(adminOrderListQuerySchema, params)
    if (!validation.success) return validation.response

    const { status, country, startDate, endDate, q, page, limit } = validation.data

    const baseFilter: Record<string, unknown> = {}

    if (country) {
      baseFilter['shippingAddress.country'] = { $regex: `^${escapeRegex(country)}$`, $options: 'i' }
    }

    if (startDate || endDate) {
      const range: Record<string, Date> = {}
      if (startDate) range.$gte = new Date(startDate)
      if (endDate)   range.$lte = new Date(endDate)
      baseFilter.createdAt = range
    }

    if (q) {
      const safe = escapeRegex(q)
      baseFilter.$or = [
        { guestEmail:     { $regex: safe, $options: 'i' } },
        { trackingNumber: { $regex: safe, $options: 'i' } },
        { 'shippingAddress.name':  { $regex: safe, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: safe, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$_id' },
              regex: safe,
              options: 'i',
            },
          },
        },
      ]
    }

    const filter: Record<string, unknown> = { ...baseFilter }
    if (status) filter.status = status

    const skip = (page - 1) * limit

    const [orders, total, statusAgg] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-statusHistory -orderLog -__v')
        .populate('user', 'name email')
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate<{ _id: OrderStatus; count: number }>([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ])

    const statusCounts = ORDER_STATUSES.reduce(
      (acc, nextStatus) => {
        acc[nextStatus] = statusAgg.find((row) => row._id === nextStatus)?.count ?? 0
        return acc
      },
      {} as Record<OrderStatus, number>,
    )

    return NextResponse.json({
      success: true,
      orders,
      statusCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    logRouteError('GET /api/admin/orders', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
