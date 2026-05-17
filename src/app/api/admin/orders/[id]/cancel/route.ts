import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { adminCancelOrderSchema } from '@/lib/validators'
import { cancelOrderAsAdmin } from '@/lib/services/orderService'
import { sendOrderStatusUpdateEmail } from '@/lib/services/emailService'
import Order from '@/models/Order'
import type { IOrder, IUser } from '@/types'

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/orders/[id]/cancel
 * Cancels an order, restores inventory, sends customer email.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const limited = await ordersRateLimit(req, { failClosed: true })
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const { id } = await ctx.params

    const body = await req.json().catch(() => ({}))
    const validation = validateData(adminCancelOrderSchema, body ?? {})
    if (!validation.success) return validation.response

    const result = await cancelOrderAsAdmin({
      orderId: id,
      adminId: String(admin._id),
      reason: validation.data.reason,
    })

    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 :
                     result.code === 'INVALID_TRANSITION' ? 409 : 500
      return apiError(status, { error: result.message, code: result.code })
    }

    // Best-effort email notification â€” fire and forget
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
          newStatus: 'cancelled',
        })
      } catch (err) {
        logRouteError('POST /api/admin/orders/[id]/cancel email', err)
      }
    })()

    return NextResponse.json({ success: true, order: result.order })
  } catch (err) {
    logRouteError('POST /api/admin/orders/[id]/cancel', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
