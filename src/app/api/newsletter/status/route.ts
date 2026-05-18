import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { validateData } from '@/lib/validate'
import { newsletterSchema } from '@/lib/validators'
import { apiError, logRouteError } from '@/lib/apiError'
import Newsletter from '@/models/Newsletter'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const email = req.nextUrl.searchParams.get('email')
    const validation = validateData(newsletterSchema, { email })
    if (!validation.success) return validation.response

    await connectDB()

    const subscriber = await Newsletter.findOne({
      email: validation.data.email,
    }).lean()

    return NextResponse.json({
      success: true,
      subscribed: Boolean(subscriber?.active),
    })
  } catch (err) {
    logRouteError('GET /api/newsletter/status', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
