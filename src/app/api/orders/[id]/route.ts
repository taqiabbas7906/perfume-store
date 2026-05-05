import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getAuthUser } from '@/lib/getAuthUser'
import Order from '@/models/Order'
import { apiError, logRouteError } from '@/lib/apiError'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    await connectDB()
    const user = await getAuthUser(req)
    if (!user) return apiError(401, { error: 'Unauthorized' })

    const order = await Order.findOne({ _id: id, user: user._id }).lean()
    if (!order) return apiError(404, { error: 'Order not found' })
    return NextResponse.json({ success: true, order })
  } catch (err) {
    logRouteError('GET /api/orders/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}