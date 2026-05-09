import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getWorldRates } from '@/lib/worldRates'
import { rateLimit } from '@/lib/rateLimit'
import { apiError } from '@/lib/apiError'

const schema = z.object({
  country:  z.string().length(2).toUpperCase(),
  state:    z.string().length(2).toUpperCase().optional(),
  subtotal: z.number().nonnegative().max(1_000_000),
})

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON' })

    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError(400, { error: 'Invalid request', details: parsed.error.flatten() })

    const { country, state, subtotal } = parsed.data
    if (country === 'US' && !state) return apiError(400, { error: 'State required for US orders' })

    const result = await getWorldRates({ country, state, subtotal })
    return NextResponse.json({ success: true, ...result })
  } catch {
    return apiError(500, { error: 'Internal server error' })
  }
}
