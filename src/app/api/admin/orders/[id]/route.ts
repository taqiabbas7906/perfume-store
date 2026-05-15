import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import Order from '@/models/Order'
import { apiError, logRouteError } from '@/lib/apiError'
import { transitionOrderStatus } from '@/lib/services/orderService'
import { sendOrderStatusUpdateEmail } from '@/lib/services/emailService'
import type { OrderStatus, IOrder, IUser } from '@/types'

type Ctx = { params: Promise<{ id: string }> }

const STATUSES: OrderStatus[] = [
  'pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled', 'refunded',
]

export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await ordersRateLimit(req, { failClosed: true })
  if (limited) return limited

  try {
    const { id } = await ctx.params
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const order = await Order.findById(id).populate('user', 'name email phone').lean()
    if (!order) return apiError(404, { error: 'Order not found' })

    return NextResponse.json({ success: true, order })
  } catch (err) {
    logRouteError('GET /api/admin/orders/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/**
 * PATCH /api/admin/orders/[id]
 * Generic status transition (use /cancel for cancel, /tracking for ship).
 * Body: { status: OrderStatus, note?: string }
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const limited = await ordersRateLimit(req, { failClosed: true })
  if (limited) return limited

  try {
    const { id } = await ctx.params
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const body = await req.json().catch(() => null)
    if (!body || typeof body.status !== 'string') {
      return apiError(400, { error: 'status is required' })
    }
    if (!STATUSES.includes(body.status as OrderStatus)) {
      return apiError(400, { error: 'Invalid status' })
    }

    const result = await transitionOrderStatus({
      orderId: id,
      nextStatus: body.status as OrderStatus,
      changedBy: 'admin',
      adminId: String(admin._id),
      note: typeof body.note === 'string' ? body.note.slice(0, 500) : undefined,
    })

    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 :
                     result.code === 'INVALID_TRANSITION' ? 409 : 500
      return apiError(status, { error: result.message, code: result.code })
    }

    // Best-effort customer notification
    if (result.previousStatus !== result.order.status) {
      void (async () => {
        try {
          const order = await Order.findById(id).populate('user', 'email').lean<IOrder & { user?: IUser }>()
          if (!order) return
          const recipient = (order.user as IUser | undefined)?.email ?? order.guestEmail
          if (!recipient) return
          await sendOrderStatusUpdateEmail({
            order,
            recipientEmail: recipient,
            oldStatus: result.previousStatus,
            newStatus: result.order.status,
          })
        } catch (err) {
          logRouteError('PATCH /api/admin/orders/[id] email', err)
        }
      })()
    }

    return NextResponse.json({ success: true, order: result.order })
  } catch (err) {
    logRouteError('PATCH /api/admin/orders/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
