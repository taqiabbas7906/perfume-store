import { NextRequest, NextResponse } from 'next/server'
import { env } from './env'

const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : []

export function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin')

  if (origin) {
    const isAllowed =
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV === 'development' &&
        (origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1')))

    if (isAllowed) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-cart-session, x-idempotency-key')
      res.headers.set('Access-Control-Allow-Credentials', 'true')
    }
  }

  return res
}

export function handleCorsPreflight(req: NextRequest): NextResponse | null {
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 })
    return withCors(req, res)
  }
  return null
}
