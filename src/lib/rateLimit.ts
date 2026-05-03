import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 100

function cleanupExpired() {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

setInterval(cleanupExpired, 60000)

export async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown'

  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || record.resetAt < now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    })
    return null
  }

  record.count++

  if (record.count > MAX_REQUESTS) {
    logger.security('Rate limit exceeded', { ip, path: req.nextUrl.pathname })
    
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((record.resetAt - now) / 1000).toString(),
          'X-RateLimit-Limit': MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS - record.count).toString(),
          'X-RateLimit-Reset': new Date(record.resetAt).toISOString(),
        },
      }
    )
  }

  return null
}