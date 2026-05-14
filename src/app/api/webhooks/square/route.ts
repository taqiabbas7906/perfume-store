import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { webhooksRateLimit } from '@/lib/rateLimit'
import { ingestSquareEvent } from '@/lib/services/webhookService'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const limited = await webhooksRateLimit(req)
  if (limited) return limited

  try {
    await connectDB()

    // ❌ Guard: reject non-POST safety (defensive)
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const rawBody = await req.text()

    // ❌ Guard: prevent empty payload attacks
    if (!rawBody || rawBody.length < 2) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
    }

    const signature = req.headers.get('x-square-hmacsha256-signature') || ''

    // ❌ Guard: reject missing signature early
    if (!signature) {
      logger.warn('Missing Square webhook signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 403 }
      )
    }

    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ''
    if (!signatureKey) {
      logger.error('Square webhook signature key missing in env')
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      )
    }

    const notificationUrl =
      process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square`

    const result = await ingestSquareEvent({
      rawBody,
      signature,
      notificationUrl,
      signatureKey,
    })

    if (!result.ok) {
      const status =
        result.code === 'INVALID_SIGNATURE'
          ? 403
          : result.code === 'BAD_PAYLOAD'
            ? 400
            : 500

      logger.warn(
        { code: result.code, message: result.message },
        'Square webhook rejected'
      )

      return NextResponse.json(
        { error: result.message, code: result.code },
        { status }
      )
    }

    return NextResponse.json({
      ok: true,
      deduplicated: result.deduplicated,
    })
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'Square webhook handler crashed'
    )

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/* ───────────────────────────────────────────── */
/* HEALTH CHECK */
/* ───────────────────────────────────────────── */

export async function GET() {
  return NextResponse.json({ ok: true })
}