import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getAuthUser, getAuthAdmin } from '@/lib/getAuthUser'
import Order from '@/models/Order'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { orderSchema } from '@/lib/validators'
import { createOrder, transitionOrderStatus } from '@/lib/services/orderService'
import { getRequestInfo } from '@/lib/getRequestInfo'
import type { OrderStatus } from '@/types'

export async function GET(req: NextRequest) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    const user = await getAuthUser(req)

    if (admin) {
      const orders = await Order.find({}).sort({ createdAt: -1 }).lean()
      return NextResponse.json({ success: true, orders })
    } else if (user) {
      const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).lean()
      return NextResponse.json({ success: true, orders })
    } else {
      return apiError(401, { error: 'Unauthorized' })
    }
  } catch (err) {
    logRouteError('GET /api/orders', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function POST(req: NextRequest) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const user = await getAuthUser(req)
    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(orderSchema, body)
    if (!validation.success) return validation.response

    const { shippingAddress, voucherCodes, idempotencyKey: clientIdempotencyKey, guestEmail, shippingAmount, taxAmount } = validation.data
    const idempotencyKey = clientIdempotencyKey || crypto.randomUUID()
    const log = await getRequestInfo(req)
    const sessionId = req.headers.get('x-cart-session') ?? undefined

    if (!user && !guestEmail) {
      return apiError(400, { error: 'Either login or provide email' })
    }

    const result = await createOrder({
      userId: user ? user._id.toString() : undefined,
      guestEmail,
      sessionId,
      idempotencyKey,
      shippingAddress,
      voucherCodes,
      log,
      shippingAmount: shippingAmount ?? 0,
      taxAmount: taxAmount ?? 0,
    })

    if (!result.ok) {
      return apiError(400, { 
        error: result.message, 
        code: result.code, 
        details: result.sku ? { sku: result.sku } : undefined 
      })
    }

    return NextResponse.json({ success: true, order: result.order, created: result.created })
  } catch (err) {
    logRouteError('POST /api/orders', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const body = await req.json().catch(() => null)
    if (!body || !body.orderId || !body.status) {
      return apiError(400, { error: 'Invalid request: orderId and status required' })
    }

    const { orderId, status } = body

    const validStatuses: OrderStatus[] = ['pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled', 'refunded']
    if (!validStatuses.includes(status)) {
      return apiError(400, { error: 'Invalid status' })
    }

    const result = await transitionOrderStatus({
      orderId,
      nextStatus: status as OrderStatus,
      changedBy: 'admin',
      adminId: String(admin._id),
      note: typeof body.note === 'string' ? body.note.slice(0, 500) : undefined,
    })

    if (!result.ok) {
      const code = result.code === 'NOT_FOUND' ? 404 :
                   result.code === 'INVALID_TRANSITION' ? 409 : 500
      return apiError(code, { error: result.message, code: result.code })
    }

    return NextResponse.json({ success: true, order: result.order })
  } catch (err) {
    logRouteError('PATCH /api/orders', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
