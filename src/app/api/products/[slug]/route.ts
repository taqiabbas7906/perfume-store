import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { productUpdateSchema } from '@/lib/validators'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()

    const { slug } = await params

    const product = await Product.findOne({
      slug,
      active: true,
    }).lean()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, product })

  } catch (error) {
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
    const user = await getAuthAdmin(req)

    if (!user) {
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

    const finalPrice = data.price !== undefined ? data.price : existingProduct.price
    const finalDiscountedPrice = data.discountedPrice !== undefined 
      ? data.discountedPrice 
      : existingProduct.discountedPrice

    if (
      finalDiscountedPrice !== undefined &&
      finalDiscountedPrice !== null &&
      finalDiscountedPrice >= finalPrice
    ) {
      return NextResponse.json(
        { error: 'Discounted price must be less than original price' },
        { status: 400 }
      )
    }

    const product = await Product.findOneAndUpdate(
      { slug, active: true },
      { $set: data },
      { returnDocument: 'after' }
    ).lean()

    return NextResponse.json({ success: true, product })

  } catch (error) {
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
    const user = await getAuthAdmin(req)

    if (!user) {
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
    ).lean()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
