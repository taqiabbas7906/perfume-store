import { NextRequest, NextResponse } from 'next/server'
import type { PipelineStage } from 'mongoose'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { escapeRegex } from '@/lib/utils/regex'
import Collection from '@/models/Collection'
import Order from '@/models/Order'
import type { OrderStatus } from '@/types'

const ORDER_STATUSES: [OrderStatus, ...OrderStatus[]] = [
  'pending',
  'paid',
  'failed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

const querySchema = z.object({
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
  collection: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(5000).default(100),
  format: z.enum(['json', 'csv']).default('json'),
})

interface RegionBreakdown {
  name: string
  count: number
  revenue: number
}

interface DashboardSummary {
  totalOrders: number
  totalRevenue: number
  taxCollected: number
  averageOrderValue: number
}

interface DashboardOrderRow {
  orderId: string
  customerName: string
  customerEmail: string
  createdAt: Date
  status: OrderStatus
  paymentStatus: string
  state: string
  country: string
  city: string
  itemCount: number
  collections: string[]
  subtotal: number
  tax: number
  shipping: number
  totalAmount: number
  currency: string
}

interface AggregateResult {
  summary: DashboardSummary[]
  states: RegionBreakdown[]
  countries: RegionBreakdown[]
  orders: DashboardOrderRow[]
}

interface PaginationSummary {
  page: number
  limit: number
  total: number
  totalPages: number
}

function parseDateInput(value: string | undefined, boundary: 'start' | 'end') {
  if (!value) return null

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/
  const normalized = dateOnly.test(value)
    ? `${value}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`
    : value

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function publicOrderId(orderId: string) {
  return `#${orderId.slice(-8).toUpperCase()}`
}

function toCsv(rows: DashboardOrderRow[]) {
  const headers = [
    'order_id',
    'customer_name',
    'customer_email',
    'created_at',
    'status',
    'payment_status',
    'collections',
    'city',
    'state',
    'country',
    'item_count',
    'subtotal',
    'tax',
    'shipping',
    'total_amount',
    'currency',
  ]

  const lines = rows.map((row) =>
    [
      publicOrderId(row.orderId),
      row.customerName,
      row.customerEmail,
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      row.status,
      row.paymentStatus,
      row.collections.join(' | '),
      row.city,
      row.state,
      row.country,
      row.itemCount,
      row.subtotal.toFixed(2),
      row.tax.toFixed(2),
      row.shipping.toFixed(2),
      row.totalAmount.toFixed(2),
      row.currency,
    ]
      .map(csvCell)
      .join(','),
  )

  return [headers.join(','), ...lines].join('\n')
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const validation = querySchema.safeParse(params)

    if (!validation.success) {
      return apiError(400, {
        error: validation.error.issues[0]?.message || 'Invalid query parameters',
      })
    }

    const { startDate, endDate, collection, country, state, status, q, page, limit, format } =
      validation.data
    const skip = (page - 1) * limit

    const createdAt: Record<string, Date> = {}
    const parsedStartDate = parseDateInput(startDate, 'start')
    const parsedEndDate = parseDateInput(endDate, 'end')

    if (startDate && !parsedStartDate) {
      return apiError(400, { error: 'Invalid start date' })
    }

    if (endDate && !parsedEndDate) {
      return apiError(400, { error: 'Invalid end date' })
    }

    if (parsedStartDate) createdAt.$gte = parsedStartDate
    if (parsedEndDate) createdAt.$lte = parsedEndDate

    const match: Record<string, unknown> = {}

    if (Object.keys(createdAt).length > 0) {
      match.createdAt = createdAt
    }

    if (status) {
      match.status = status
    }

    if (country) {
      match['shippingAddress.country'] = {
        $regex: `^${escapeRegex(country)}$`,
        $options: 'i',
      }
    }

    if (state) {
      match['shippingAddress.state'] = {
        $regex: `^${escapeRegex(state)}$`,
        $options: 'i',
      }
    }

    if (q) {
      const safe = escapeRegex(q)
      match.$or = [
        { guestEmail: { $regex: safe, $options: 'i' } },
        { trackingNumber: { $regex: safe, $options: 'i' } },
        { 'shippingAddress.name': { $regex: safe, $options: 'i' } },
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

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDocs',
        },
      },
      {
        $lookup: {
          from: 'collections',
          localField: 'productDocs.collectionId',
          foreignField: '_id',
          as: 'collectionDocs',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDocs',
        },
      },
      {
        $addFields: {
          collectionNames: {
            $setUnion: [
              {
                $map: {
                  input: '$collectionDocs',
                  as: 'collection',
                  in: '$$collection.name',
                },
              },
              [],
            ],
          },
          customerName: {
            $ifNull: [
              { $arrayElemAt: ['$userDocs.name', 0] },
              '$shippingAddress.name',
            ],
          },
          customerEmail: {
            $ifNull: [
              { $arrayElemAt: ['$userDocs.email', 0] },
              '$guestEmail',
            ],
          },
        },
      },
    ]

    if (collection) {
      pipeline.push({
        $match: {
          'collectionDocs.name': {
            $regex: escapeRegex(collection),
            $options: 'i',
          },
        },
      })
    }

    pipeline.push({
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' },
              taxCollected: { $sum: '$tax' },
              averageOrderValue: { $avg: '$totalAmount' },
            },
          },
          {
            $project: {
              _id: 0,
              totalOrders: 1,
              totalRevenue: { $round: ['$totalRevenue', 2] },
              taxCollected: { $round: ['$taxCollected', 2] },
              averageOrderValue: { $round: ['$averageOrderValue', 2] },
            },
          },
        ],
        states: [
          {
            $group: {
              _id: {
                $cond: [
                  {
                    $gt: [
                      {
                        $strLenCP: {
                          $trim: {
                            input: { $ifNull: ['$shippingAddress.state', ''] },
                          },
                        },
                      },
                      0,
                    ],
                  },
                  '$shippingAddress.state',
                  'Unspecified',
                ],
              },
              count: { $sum: 1 },
              revenue: { $sum: '$totalAmount' },
            },
          },
          {
            $project: {
              _id: 0,
              name: '$_id',
              count: 1,
              revenue: { $round: ['$revenue', 2] },
            },
          },
          { $sort: { count: -1, name: 1 } },
        ],
        countries: [
          {
            $group: {
              _id: '$shippingAddress.country',
              count: { $sum: 1 },
              revenue: { $sum: '$totalAmount' },
            },
          },
          {
            $project: {
              _id: 0,
              name: '$_id',
              count: 1,
              revenue: { $round: ['$revenue', 2] },
            },
          },
          { $sort: { count: -1, name: 1 } },
        ],
        orders: [
          { $sort: { createdAt: -1 } },
          { $skip: format === 'csv' ? 0 : skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              orderId: { $toString: '$_id' },
              customerName: { $ifNull: ['$customerName', 'Guest customer'] },
              customerEmail: { $ifNull: ['$customerEmail', ''] },
              createdAt: 1,
              status: 1,
              paymentStatus: 1,
              state: {
                $ifNull: ['$shippingAddress.state', ''],
              },
              country: '$shippingAddress.country',
              city: {
                $ifNull: ['$shippingAddress.city', ''],
              },
              itemCount: { $size: '$items' },
              collections: '$collectionNames',
              subtotal: 1,
              tax: 1,
              shipping: 1,
              totalAmount: 1,
              currency: 1,
            },
          },
        ],
      },
    })

    const [aggregate, collectionOptions] = await Promise.all([
      Order.aggregate<AggregateResult>(pipeline),
      Collection.find({})
        .sort({ name: 1 })
        .select('name -_id')
        .lean(),
    ])

    const data = aggregate[0] ?? {
      summary: [],
      states: [],
      countries: [],
      orders: [],
    }

    const summary: DashboardSummary = data.summary[0] ?? {
      totalOrders: 0,
      totalRevenue: 0,
      taxCollected: 0,
      averageOrderValue: 0,
    }

    const pagination: PaginationSummary = {
      page,
      limit,
      total: summary.totalOrders,
      totalPages: Math.max(1, Math.ceil(summary.totalOrders / limit)),
    }

    if (format === 'csv') {
      const csv = toCsv(data.orders)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="orders-dashboard-export.csv"',
        },
      })
    }

    return NextResponse.json({
      success: true,
      summary,
      states: data.states,
      countries: data.countries,
      orders: data.orders,
      pagination,
      collectionOptions: collectionOptions.map((entry) => entry.name).filter(Boolean),
    })
  } catch (err) {
    logRouteError('GET /api/admin/analytics/orders-dashboard', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
