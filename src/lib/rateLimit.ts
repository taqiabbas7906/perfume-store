import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/* ───────────────────────────────────────────── */
/* Redis client setup */
/* ───────────────────────────────────────────── */

let redisClient: Redis | null = null
const limiterCache = new Map<string, Ratelimit>()

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
  )
}

function getRedisClient(): Redis | null {
  if (!isUpstashConfigured()) return null

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }

  return redisClient
}

/* ───────────────────────────────────────────── */
/* Limiter config */
/* ───────────────────────────────────────────── */

export interface LimiterConfig {
  name: string
  limit: number
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`
}

/* ───────────────────────────────────────────── */
/* Limiter factory (cached) */
/* ───────────────────────────────────────────── */

function getLimiter(config: LimiterConfig): Ratelimit | null {
  const redis = getRedisClient()
  if (!redis) return null

  let limiter = limiterCache.get(config.name)

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      prefix: `rl:${config.name}`,
      analytics: false,
    })

    limiterCache.set(config.name, limiter)
  }

  return limiter
}

/* ───────────────────────────────────────────── */
/* IP extraction (correct proxy-safe version) */
/* ───────────────────────────────────────────── */

function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (ips.length > 0) {
      return ips[0] // correct: original client IP
    }
  }

  return 'unknown'
}

/* ───────────────────────────────────────────── */
/* Core limiter logic */
/* ───────────────────────────────────────────── */

async function applyLimit(
  req: NextRequest,
  config: LimiterConfig
): Promise<NextResponse | null> {
  const limiter = getLimiter(config)

  // Fail-open strategy (never break API if Redis is down)
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn(
        { limiter: config.name },
        'Rate limit skipped (Redis not configured)'
      )
    }
    return null
  }

  const ip = getClientIp(req)

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip)

    if (success) return null

    const retryAfter = Math.max(
      1,
      Math.ceil((reset - Date.now()) / 1000)
    )

    logger.warn(
      { ip, limiter: config.name, retryAfter },
      `Rate limit exceeded [${config.name}]`
    )

    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
        },
      }
    )
  } catch (err) {
    logger.error({ err, limiter: config.name }, 'Rate limiter error')
    return null
  }
}

/* ───────────────────────────────────────────── */
/* Base limiters */
/* ───────────────────────────────────────────── */

const GLOBAL: LimiterConfig = {
  name: 'global',
  limit: 100,
  window: '1 m',
}

const AUTH: LimiterConfig = {
  name: 'auth',
  limit: 5,
  window: '15 m',
}

/* ───────────────────────────────────────────── */
/* Feature-specific limiters (MERGED FROM EMERGENT IDEA) */
/* ───────────────────────────────────────────── */

const CART: LimiterConfig = {
  name: 'cart',
  limit: 60,
  window: '1 m',
}

const ORDERS: LimiterConfig = {
  name: 'orders',
  limit: 20,
  window: '1 m',
}

const PAYMENTS: LimiterConfig = {
  name: 'payments',
  limit: 10,
  window: '1 m',
}

const WEBHOOKS: LimiterConfig = {
  name: 'webhooks',
  limit: 200,
  window: '1 m',
}

/* ───────────────────────────────────────────── */
/* Public API helpers */
/* ───────────────────────────────────────────── */

export function rateLimit(req: NextRequest) {
  return applyLimit(req, GLOBAL)
}

export function authRateLimit(req: NextRequest) {
  return applyLimit(req, AUTH)
}

export function cartRateLimit(req: NextRequest) {
  return applyLimit(req, CART)
}

export function ordersRateLimit(req: NextRequest) {
  return applyLimit(req, ORDERS)
}

export function paymentsRateLimit(req: NextRequest) {
  return applyLimit(req, PAYMENTS)
}

export function webhooksRateLimit(req: NextRequest) {
  return applyLimit(req, WEBHOOKS)
}

/* ───────────────────────────────────────────── */
/* Advanced usage (optional) */
/* ───────────────────────────────────────────── */

export function customRateLimit(
  req: NextRequest,
  config: LimiterConfig
) {
  return applyLimit(req, config)
}