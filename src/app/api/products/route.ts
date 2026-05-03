import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { validateData } from '@/lib/validate'
import { productSchema } from '@/lib/validators'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    await connectDB()

    const { searchParams } = new URL(req.url)

    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort')
    const page = Math.max(1, Math.min(100, parseInt(searchParams.get('page') || '1')))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '12')))

    const query: any = { active: true }

    if (category && ['men', 'women', 'unisex'].includes(category)) {
      query.category = category
    }

    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { brand: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ]
    }

    if (minPrice || maxPrice) {
      const min = parseFloat(minPrice || '0')
      const max = parseFloat(maxPrice || '100000')
      
      if (!isNaN(min) && !isNaN(max) && min >= 0 && max <= 100000 && max >= min) {
        query['skus.originalPrice'] = { $gte: min, $lte: max }
      }
    }

    if (featured === 'true') {
      query.featured = true
    }

    const allowedSorts = ['price_asc', 'price_desc', 'newest', 'oldest']
    let sortQuery: any = { createdAt: -1 }

    if (sort && allowedSorts.includes(sort)) {
      if (sort === 'price_asc') sortQuery = { 'skus.originalPrice': 1 }
      if (sort === 'price_desc') sortQuery = { 'skus.originalPrice': -1 }
      if (sort === 'newest') sortQuery = { createdAt: -1 }
      if (sort === 'oldest') sortQuery = { createdAt: 1 }
    }

    const skip = Math.min((page - 1) * limit, 10000)

    const total = await Product.countDocuments(query)

    const products = await Product.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean()

    return NextResponse.json(
      {
        success: true,
        products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      }
    )

  } catch (error: any) {
    logger.error('Error fetching products', { error: error.message })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    const user = await getAuthAdmin(req)

    if (!user) {
      logger.security('Unauthorized product creation attempt')
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await connectDB()

    const body = await req.json()

    const validation = validateData(productSchema, body)

    if (!validation.success) {
      logger.warn('Product validation failed', { errors: validation })
      return validation.response
    }

    const data = validation.data

    const existingProduct = await Product.findOne({ slug: data.slug })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'A product with this slug already exists' },
        { status: 400 }
      )
    }

    const skuValues = data.skus.map((sku: any) => sku.sku)
    const duplicateSkus = skuValues.filter((item: string, index: number) => skuValues.indexOf(item) !== index)
    
    if (duplicateSkus.length > 0) {
      return NextResponse.json(
        { error: 'Duplicate SKUs found: ' + duplicateSkus.join(', ') },
        { status: 400 }
      )
    }

    const product = await Product.create(data)

    logger.info('Product created', { productId: product._id, userId: user._id, slug: product.slug })

    return NextResponse.json(
      { success: true, product },
      { status: 201 }
    )

  } catch (error: any) {
    logger.error('Error creating product', { error: error.message, stack: error.stack })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}