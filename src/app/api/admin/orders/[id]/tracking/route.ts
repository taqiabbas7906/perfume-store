import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { adminTrackingSchema } from '@/lib/validators'
import { addOrderTracking } from '@/lib/services/orderService'
import { sendShippingConfirmationEmail } from '@/lib/services/emailService'
import Order from '@/models/Order'
import type { IOrder, IUser } from '@/types'

type Ctx = { params: Promise<{ id: string }> }

/**
 * PATCH /api/admin/orders/[id]/tracking
 * Adds or updates a tracking number on a paid/shipped order.
 * Side effects:
 *   - if order was 'paid', transitions to 'shipped' and stamps shippedAt
 *   - appends a status-history entry
 *   - sends a shipping confirmation email (best effort)
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const limited = await ordersRateLimit(req, { failClosed: true })
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const { id } = await ctx.params

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(adminTrackingSchema, body)
    if (!validation.success) return validation.response

    const { trackingNumber, trackingCarrier, trackingUrl } = validation.data

    const result = await addOrderTracking({
      orderId: id,
      adminId: String(admin._id),
      trackingNumber,
      trackingCarrier,
      trackingUrl: trackingUrl || undefined,
    })

    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 :
                     result.code === 'INVALID_STATUS' ? 409 : 500
      return apiError(status, { error: result.message, code: result.code })
    }

    if (!result.alreadyShipped) {
      // Email customer when the order is first marked as shipped.
      void (async () => {
        try {
          const order = await Order.findById(id).populate('user', 'email').lean<IOrder & { user?: IUser }>()
          if (!order) return
          const recipient = (order.user as IUser | undefined)?.email ?? order.guestEmail
          if (!recipient) return
          await sendShippingConfirmationEmail({
            order,
            recipientEmail: recipient,
            trackingNumber,
            trackingCarrier,
            trackingUrl: trackingUrl || undefined,
          })
        } catch (err) {
          logRouteError('PATCH /api/admin/orders/[id]/tracking email', err)
        }
      })()
    }

    return NextResponse.json({ success: true, order: result.order })
  } catch (err) {
    logRouteError('PATCH /api/admin/orders/[id]/tracking', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
