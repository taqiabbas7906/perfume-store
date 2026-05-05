import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getAuthUser, getAuthAdmin } from '@/lib/getAuthUser'
import Order from '@/models/Order'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { orderSchema } from '@/lib/validators'
import { createOrder } from '@/lib/services/orderService'
import { getRequestInfo } from '@/lib/getRequestInfo'

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
    if (!user) return apiError(401, { error: 'Unauthorized' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(orderSchema, body)
    if (!validation.success) return validation.response

    const { shippingAddress, voucherCode } = validation.data
    const idempotencyKey = crypto.randomUUID()
    const log = await getRequestInfo(req)

    const result = await createOrder({
      userId: user._id.toString(),
      idempotencyKey,
      shippingAddress,
      voucherCode,
      log,
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

    const validStatuses = ['pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled', 'refunded']
    if (!validStatuses.includes(status)) {
      return apiError(400, { error: 'Invalid status' })
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    )

    if (!order) return apiError(404, { error: 'Order not found' })

    return NextResponse.json({ success: true, order })
  } catch (err) {
    logRouteError('PATCH /api/orders', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
