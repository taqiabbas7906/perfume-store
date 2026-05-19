import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import Product from '@/models/Product'
import {
  getAlgoliaClient,
  algoliaIndex,
  toAlgoliaRecord,
  configureAlgoliaIndex,
} from '@/lib/algolia'

/* ─────────────────────────────────────────────────────────────
 * GET /api/admin/algolia/sync
 * Admin only — lightweight search index status for the admin UI.
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const [activeProducts, inactiveProducts, totalProducts] = await Promise.all([
      Product.countDocuments({ active: true }),
      Product.countDocuments({ active: false }),
      Product.countDocuments({}),
    ])

    return NextResponse.json({
      success: true,
      indexName: algoliaIndex,
      algoliaConfigured: Boolean(
        process.env.NEXT_PUBLIC_ALGOLIA_APP_ID &&
          process.env.ALGOLIA_ADMIN_KEY,
      ),
      counts: {
        activeProducts,
        inactiveProducts,
        totalProducts,
      },
    })
  } catch (err) {
    logRouteError('GET /api/admin/algolia/sync', err)
    return apiError(500, { error: 'Failed to load search sync status' })
  }
}

/* ─────────────────────────────────────────────────────────────
 * POST /api/admin/algolia/sync
 * Bulk-indexes all active products into Algolia in batches.
 * Also applies index settings (searchable attributes, facets).
 * ───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    if (!process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || !process.env.ALGOLIA_ADMIN_KEY) {
      return apiError(503, { error: 'Algolia is not configured' })
    }

    await connectDB()

    // Apply index settings first
    await configureAlgoliaIndex()

    const client  = getAlgoliaClient()
    const BATCH   = 100
    let   skip    = 0
    let   indexed = 0

    while (true) {
      const products = await Product.find({ active: true })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(BATCH)
        .lean()

      if (!products.length) break

      const objects = products.map(toAlgoliaRecord)
      await client.saveObjects({ indexName: algoliaIndex, objects })

      indexed += products.length
      skip    += BATCH

      if (products.length < BATCH) break
    }

    // Re-apply settings after indexing (ensures they survive a full reindex)
    await configureAlgoliaIndex()

    return NextResponse.json({ success: true, indexed })
  } catch (err) {
    logRouteError('POST /api/admin/algolia/sync', err)
    return apiError(500, { error: 'Sync failed' })
  }
}
