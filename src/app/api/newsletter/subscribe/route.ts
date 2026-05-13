import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { validateData } from '@/lib/validate'
import { newsletterSchema } from '@/lib/validators'
import { apiError, logRouteError } from '@/lib/apiError'
import Newsletter from '@/models/Newsletter'

/* ─────────────────────────────────────────────────────────────
 * POST /api/newsletter/subscribe
 * Body: { email }
 * ───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(newsletterSchema, body)
    if (!validation.success) return validation.response

    const { email } = validation.data

    await connectDB()

    const existing = await Newsletter.findOne({ email })

    if (existing) {
      if (existing.active) {
        return NextResponse.json({ success: true, message: 'Already subscribed' })
      }
      existing.active = true
      existing.subscribedAt = new Date()
      await existing.save()
      return NextResponse.json({ success: true, message: 'Resubscribed successfully' })
    }

    await Newsletter.create({ email, subscribedAt: new Date(), active: true })
    return NextResponse.json({ success: true, message: 'Subscribed successfully' }, { status: 201 })
  } catch (err) {
    logRouteError('POST /api/newsletter/subscribe', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
