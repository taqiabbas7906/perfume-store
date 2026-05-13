import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { ordersRateLimit } from '@/lib/rateLimit'
import { getVoucherAnalytics, getVoucherUsageHistory } from '@/lib/services/voucherService'
import Voucher from '@/models/Voucher'
import { apiError, logRouteError } from '@/lib/apiError'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const { id } = await ctx.params

    const analytics = await getVoucherAnalytics(id)
    if (!analytics) {
      return apiError(404, { error: 'Voucher not found' })
    }

    const usageHistory = await getVoucherUsageHistory(id, 50)

    return NextResponse.json({
      success: true,
      voucher: analytics.voucher,
      analytics: {
        usageCount: analytics.usageCount,
        totalDiscount: analytics.totalDiscount,
      },
      usageHistory,
    })
  } catch (err) {
    logRouteError('GET /api/admin/vouchers/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const { id } = await ctx.params

    const voucher = await Voucher.findByIdAndUpdate(
      id,
      { $set: { active: false } },
      { returnDocument: 'after' }
    ).lean()

    if (!voucher) {
      return apiError(404, { error: 'Voucher not found' })
    }

    return NextResponse.json({ success: true, voucher })
  } catch (err) {
    logRouteError('DELETE /api/admin/vouchers/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
