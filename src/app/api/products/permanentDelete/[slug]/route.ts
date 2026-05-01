import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import { getAuthAdmin } from '@/lib/getAuthUser'

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
  
      const product = await Product.findOneAndDelete(
        { slug }
      )
  
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
  
      return NextResponse.json({
        success: true,
        message: 'Product permanently deleted successfully',
      })
  
    } catch (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }