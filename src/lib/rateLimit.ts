import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null
const limiterCache = new Map<string, Ratelimit>()

type LocalBucket = {
  count: number
  reset: number
}

type LimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

const localBuckets = new Map<string, LocalBucket>()
const fallbackWarnings = new Set<string>()
let nextLocalSweep = 0

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

export interface LimiterConfig {
  name: string
  limit: number
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`
}

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

function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (ips.length > 0) return ips[0]
  }

  return 'unknown'
}

function parseWindowMs(window: LimiterConfig['window']) {
  const [amountRaw, unit] = window.split(' ') as [
    string,
    's' | 'm' | 'h' | 'd',
  ]
  const amount = Number(amountRaw)
  const multipliers = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  } as const

  return amount * multipliers[unit]
}

function sweepLocalBuckets(now: number) {
  if (now < nextLocalSweep) return
  nextLocalSweep = now + 60_000

  for (const [key, bucket] of localBuckets.entries()) {
    if (bucket.reset <= now) localBuckets.delete(key)
  }
}

function localLimit(config: LimiterConfig, ip: string): LimitResult {
  const now = Date.now()
  sweepLocalBuckets(now)

  const key = `${config.name}:${ip}`
  let bucket = localBuckets.get(key)

  if (!bucket || bucket.reset <= now) {
    bucket = {
      count: 0,
      reset: now + parseWindowMs(config.window),
    }
    localBuckets.set(key, bucket)
  }

  bucket.count += 1

  return {
    success: bucket.count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    reset: bucket.reset,
  }
}

function logRedisFallback(config: LimiterConfig, failClosed: boolean) {
  if (process.env.NODE_ENV !== 'production') return
  if (fallbackWarnings.has(config.name)) return

  fallbackWarnings.add(config.name)
  logger.warn(
    { limiter: config.name, failClosed },
    'Rate limiting using in-memory fallback (Redis not configured)'
  )
}

function rateLimitExceededResponse(
  ip: string,
  limiter: string,
  result: LimitResult
) {
  const retryAfter = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000)
  )

  logger.warn(
    { ip, limiter, retryAfter },
    `Rate limit exceeded [${limiter}]`
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
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.reset).toISOString(),
      },
    }
  )
}

async function applyLimit(
  req: NextRequest,
  config: LimiterConfig,
  options?: { failClosed?: boolean }
): Promise<NextResponse | null> {
  const failClosed = options?.failClosed ?? false
  const ip = getClientIp(req)
  const limiter = getLimiter(config)

  if (!limiter) {
    logRedisFallback(config, failClosed)
    const result = localLimit(config, ip)

    if (result.success) return null
    return rateLimitExceededResponse(ip, config.name, result)
  }

  try {
    const result = await limiter.limit(ip)

    if (result.success) return null
    return rateLimitExceededResponse(ip, config.name, result)
  } catch (err) {
    logger.error({ err, limiter: config.name, failClosed }, 'Rate limiter error')

    if (failClosed) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    return null
  }
}

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

export function rateLimit(req: NextRequest, options?: { failClosed?: boolean }) {
  return applyLimit(req, GLOBAL, options)
}

export function authRateLimit(
  req: NextRequest,
  options?: { failClosed?: boolean }
) {
  return applyLimit(req, AUTH, options)
}

export function cartRateLimit(
  req: NextRequest,
  options?: { failClosed?: boolean }
) {
  return applyLimit(req, CART, options)
}

export function ordersRateLimit(
  req: NextRequest,
  options?: { failClosed?: boolean }
) {
  return applyLimit(req, ORDERS, options)
}

export function paymentsRateLimit(
  req: NextRequest,
  options?: { failClosed?: boolean }
) {
  return applyLimit(req, PAYMENTS, options)
}

export function webhooksRateLimit(
  req: NextRequest,
  options?: { failClosed?: boolean }
) {
  return applyLimit(req, WEBHOOKS, options)
}

export function customRateLimit(
  req: NextRequest,
  config: LimiterConfig,
  options?: { failClosed?: boolean }
) {
  return applyLimit(req, config, options)
}
