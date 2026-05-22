import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { apiError, logRouteError } from '@/lib/apiError'
import { getSettings } from '@/models/Settings'

// Never cache — admin changes to the tagline / free-delivery toggle must be
// visible on the storefront on the very next request.
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/settings
 *
 * Public, read-only snapshot of store-wide configuration that the
 * storefront needs to render correctly (free-delivery badge, cart progress
 * bar, etc). No secrets are exposed.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    await connectDB()
    const s = await getSettings()
    return NextResponse.json({
      success: true,
      settings: {
        freeDelivery: {
          enabled: !!s.freeDelivery?.enabled,
          threshold: s.freeDelivery?.threshold ?? 0,
        },
        homepage: {
          tagline: s.homepage?.tagline ?? '',
        },
      },
    })
  } catch (err) {
    logRouteError('GET /api/settings', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
