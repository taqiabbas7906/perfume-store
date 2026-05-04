// src/lib/authRateLimit.ts
import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

interface RateLimitRecord {
  count: number
  resetAt: number
}

const stores: Record<string, Map<string, RateLimitRecord>> = {}

function getStore(name: string): Map<string, RateLimitRecord> {
  if (!stores[name]) {
    stores[name] = new Map()
  }
  return stores[name]
}

export function createRateLimiter(
  name: string,
  maxRequests: number,
  windowMs: number
) {
  return async function rateLimiter(
    req: NextRequest
  ): Promise<NextResponse | null> {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip =
      forwarded?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    const store = getStore(name)
    const now = Date.now()
    const record = store.get(ip)

    if (!record || record.resetAt < now) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
      return null
    }

    record.count++

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000)

      logger.warn({ ip }, `Rate limit exceeded [${name}]`)

      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
          },
        }
      )
    }

    return null
  }
}

// 5 forgot-password attempts per 15 minutes
export const forgotPasswordRateLimit = createRateLimiter(
  'forgot-password',
  5,
  15 * 60 * 1000
)

// 10 change-password attempts per 15 minutes
export const changePasswordRateLimit = createRateLimiter(
  'change-password',
  10,
  15 * 60 * 1000
)

// 20 sync attempts per minute
export const syncRateLimit = createRateLimiter(
  'sync',
  20,
  60 * 1000
)