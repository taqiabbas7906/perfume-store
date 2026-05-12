import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { manualStockAdjustment } from '@/lib/inventory'
import Product from '@/models/Product'
import InventoryLog from '@/models/InventoryLog'
import { z } from 'zod'

type Ctx = { params: Promise<{ slug: string }> }

const adjustSchema = z.object({
  variantSku:       z.string().min(1),
  newQuantity:      z.number().int().min(0).max(999999),
  lowStockThreshold: z.number().int().min(0).max(9999).optional(),
  note:             z.string().max(500).trim().optional(),
})

/**
 * PATCH /api/admin/products/[slug]/inventory
 * Manually set variant stock + optional threshold.
 * Writes an InventoryLog entry.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const { slug } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const parsed = adjustSchema.safeParse(body)
    if (!parsed.success) return apiError(400, { error: 'Validation failed', details: parsed.error.flatten() })

    const product = await Product.findOne({ slug })
    if (!product) return apiError(404, { error: 'Product not found' })

    const variant = product.variants.find((v: any) => v.sku === parsed.data.variantSku)
    if (!variant) return apiError(404, { error: `Variant SKU "${parsed.data.variantSku}" not found` })

    const result = await manualStockAdjustment({
      productId:  product._id.toString(),
      variantSku: parsed.data.variantSku,
      newQuantity: parsed.data.newQuantity,
      adminId:    admin._id.toString(),
      note:       parsed.data.note,
    })

    if (!result.ok) return apiError(500, { error: 'Stock adjustment failed' })

    // Optionally update lowStockThreshold on the variant
    if (parsed.data.lowStockThreshold != null) {
      await Product.updateOne(
        { _id: product._id, 'variants.sku': parsed.data.variantSku },
        { $set: { 'variants.$.lowStockThreshold': parsed.data.lowStockThreshold } }
      )
    }

    return NextResponse.json({
      success: true,
      variantSku: parsed.data.variantSku,
      quantityBefore: result.quantityBefore,
      quantityAfter:  result.quantityAfter,
      delta: result.quantityAfter - result.quantityBefore,
    })
  } catch (err) {
    logRouteError('PATCH /api/admin/products/[slug]/inventory', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/**
 * GET /api/admin/products/[slug]/inventory
 * Returns full inventory detail + audit log for the product.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const { slug } = await ctx.params
    const product = await Product.findOne({ slug })
      .select('name slug variants totalStock')
      .lean() as any

    if (!product) return apiError(404, { error: 'Product not found' })

    const logs = await InventoryLog.find({ productId: product._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('adminId', 'name email')
      .populate('orderId', '_id status')
      .lean()

    return NextResponse.json({ success: true, product, logs })
  } catch (err) {
    logRouteError('GET /api/admin/products/[slug]/inventory', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
