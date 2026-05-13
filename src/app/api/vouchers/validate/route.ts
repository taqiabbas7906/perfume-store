import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ordersRateLimit } from '@/lib/rateLimit'
import { validateVoucher } from '@/lib/services/voucherService'
import { getAuthUser } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { getRequestInfo } from '@/lib/getRequestInfo'
import Product from '@/models/Product'
import { z } from 'zod'
import { Types } from 'mongoose'

const validateVoucherSchema = z.object({
  code: z.string().min(1).trim(),
  cartTotal: z.number().min(0),
  productIds: z.array(z.string()).optional(),
  guestEmail: z.string().email().optional(),
})

export async function POST(req: NextRequest) {
  const limited = await ordersRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const user = await getAuthUser(req)
    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateVoucherSchema.safeParse(body)
    if (!validation.success) {
      return apiError(400, {
        error: 'Invalid request',
        details: validation.error.flatten(),
      })
    }

    const { code, cartTotal, productIds, guestEmail } = validation.data

    let categoryIdsInCart: string[] = []
    let productIdsInCart: Types.ObjectId[] = []

    if (productIds && productIds.length > 0) {
      const validProductIds = productIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id))

      if (validProductIds.length > 0) {
        const products = await Product.find({
          _id: { $in: validProductIds },
        }).lean()
        categoryIdsInCart = products.map((p) => p.category)
        productIdsInCart = validProductIds
      }
    }

    const result = await validateVoucher({
      voucherCode: code,
      cartTotal,
      productIdsInCart,
      categoryIdsInCart,
      userId: user?._id.toString(),
      guestEmail,
      guestIp: getRequestInfo(req).ipAddress,
    })

    if (!result.ok) {
      return apiError(400, { error: result.message, code: result.code })
    }

    return NextResponse.json({
      success: true,
      voucher: result.voucher,
      discountAmount: result.discountAmount,
    })
  } catch (err) {
    logRouteError('POST /api/vouchers/validate', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
