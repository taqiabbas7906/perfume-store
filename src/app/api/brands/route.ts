import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import Brand from '@/models/Brand'
import Product from '@/models/Product'

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const isLuxury = searchParams.get('isLuxury')
    const filter: Record<string, unknown> = { active: true }
    if (isLuxury === 'true') filter.isLuxury = true

    const [curated, productBrands] = await Promise.all([
      Brand.find(filter).sort({ sortOrder: 1, name: 1 }).select('-__v').lean(),
      // Distinct brand strings that actually appear on active products.
      // Falls back when the curated Brand collection is empty so the
      // shop's Brand filter is always populated from real data.
      isLuxury === 'true'
        ? Promise.resolve([] as string[])
        : Product.distinct('brand', { active: true }) as Promise<string[]>,
    ])

    const seen = new Set(curated.map((b) => b.name.toLowerCase()))
    const derived = productBrands
      .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      .filter((n) => !seen.has(n.toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        _id: `derived:${slugify(name)}`,
        name,
        slug: slugify(name),
        active: true,
        isLuxury: false,
        sortOrder: 9999,
      }))

    return NextResponse.json({
      success: true,
      brands: [...curated, ...derived],
    })
  } catch (err) {
    logRouteError('GET /api/brands', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
