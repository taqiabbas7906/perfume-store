import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export async function GET() {
  try {
    await connectDB()
    return NextResponse.json({
      ok: true,
      service: 'perfume-store',
      ts: new Date().toISOString(),
      square: {
        configured: Boolean(
          process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID
        ),
        environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
        webhookConfigured: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY),
      },
      upstash: {
        configured: Boolean(
          process.env.UPSTASH_REDIS_REST_URL &&
            process.env.UPSTASH_REDIS_REST_TOKEN
        ),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 503 }
    )
  }
}