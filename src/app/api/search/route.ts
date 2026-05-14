import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import { getAlgoliaClient, algoliaIndex } from '@/lib/algolia'

/* ─────────────────────────────────────────────────────────────
 * GET /api/search?q=oud&limit=6
 * Proxies Algolia search — keeps the admin key server-side.
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const sp    = req.nextUrl.searchParams
  const query = sp.get('q')?.trim() ?? ''
  const limit = Math.min(20, Math.max(1, parseInt(sp.get('limit') ?? '6')))

  if (!query) return NextResponse.json({ hits: [] })

  if (!process.env.ALGOLIA_ADMIN_KEY) {
    return apiError(503, { error: 'Search is not configured' })
  }

  try {
    const client = getAlgoliaClient()
    const result = await client.searchSingleIndex({
      indexName:    algoliaIndex,
      searchParams: {
        query,
        hitsPerPage: limit,
      },
    })

    return NextResponse.json({ hits: result.hits })
  } catch (err: any) {
    // Index not yet created — return empty results instead of 500
    const msg = err?.message ?? ''
    if (msg.includes('does not exist') || err?.status === 404) {
      return NextResponse.json({ hits: [] })
    }
    logRouteError('GET /api/search', err)
    return apiError(500, { error: 'Search failed' })
  }
}
