import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { validateData } from '@/lib/validate'
import { newsletterSchema } from '@/lib/validators'
import { apiError, logRouteError } from '@/lib/apiError'
import Newsletter from '@/models/Newsletter'

/* ─────────────────────────────────────────────────────────────
 * POST /api/newsletter/unsubscribe
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

    const subscriber = await Newsletter.findOne({ email })

    if (!subscriber || !subscriber.active) {
      return NextResponse.json({ success: true, message: 'Email not found or already unsubscribed' })
    }

    subscriber.active = false
    await subscriber.save()

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' })
  } catch (err) {
    logRouteError('POST /api/newsletter/unsubscribe', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
