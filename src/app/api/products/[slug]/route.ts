import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { productUpdateSchema } from '@/lib/validators'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const rateLimitResponse = await rateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    await connectDB()

    const { slug } = await params

    const product = await Product.findOne({
      slug,
      active: true,
    }).select('-__v').lean()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, product },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
        },
      }
    )

  } catch (error: any) {
    logger.error('Error fetching product', { error: error.message, slug: (await params).slug })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const rateLimitResponse = await rateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    const user = await getAuthAdmin(req)

    if (!user) {
      logger.security('Unauthorized product update attempt')
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await connectDB()

    const { slug } = await params

    const body = await req.json()

    const validation = validateData(productUpdateSchema, body)

    if (!validation.success) {
      logger.warn('Product update validation failed', { errors: validation })
      return validation.response
    }

    const data = validation.data

    if (data.slug && data.slug !== slug) {
      const existingProduct = await Product.findOne({ slug: data.slug })
      if (existingProduct) {
        return NextResponse.json(
          { error: 'A product with this slug already exists' },
          { status: 400 }
        )
      }
    }

    const existingProduct = await Product.findOne({ slug, active: true })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (data.skus) {
      const skuValues = data.skus.map((sku: any) => sku.sku)
      const duplicateSkus = skuValues.filter((item: string, index: number) => skuValues.indexOf(item) !== index)
      
      if (duplicateSkus.length > 0) {
        return NextResponse.json(
          { error: 'Duplicate SKUs found: ' + duplicateSkus.join(', ') },
          { status: 400 }
        )
      }
    }

    const product = await Product.findOneAndUpdate(
      { slug, active: true },
      { $set: data },
      { returnDocument: 'after' }
    ).select('-__v').lean()

    logger.info('Product updated', { productId: product?._id, userId: user._id, slug })

    return NextResponse.json({ success: true, product })

  } catch (error: any) {
    logger.error('Error updating product', { error: error.message, slug: (await params).slug })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const rateLimitResponse = await rateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    const user = await getAuthAdmin(req)

    if (!user) {
      logger.security('Unauthorized product deletion attempt')
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await connectDB()

    const { slug } = await params

    const product = await Product.findOneAndUpdate(
      { slug },
      { $set: { active: false } },
      { returnDocument: 'after' }
    ).select('-__v').lean()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    logger.info('Product deleted (soft)', { productId: product._id, userId: user._id, slug })

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    })

  } catch (error: any) {
    logger.error('Error deleting product', { error: error.message, slug: (await params).slug })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}