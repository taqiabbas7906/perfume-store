import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null
const limiterCache = new Map<string, Ratelimit>()

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
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

interface LimiterConfig {
  /** unique name used as Redis prefix and log tag */
  name: string
  /** number of requests allowed in the window */
  limit: number
  /** sliding window duration, e.g. \"1 m\", \"15 m\" */
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

/**
 * Best-effort IP extraction.
 *
 * Header trust order:
 * 1. `x-real-ip` — set by trusted reverse proxies (Vercel, Cloudflare proxy, Nginx)
 * 2. `x-forwarded-for` — last entry is the most-recent (closest) trusted proxy
 *
 * Never trust the FIRST entry of x-forwarded-for in untrusted environments,
 * because clients can prepend arbitrary values.
 */
function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (ips.length) return ips[ips.length - 1]
  }

  return 'unknown'
}

async function applyLimit(
  req: NextRequest,
  config: LimiterConfig
): Promise<NextResponse | null> {
  const limiter = getLimiter(config)
  // No Redis configured -> fail open in dev, log once per cold start.
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn({ limiter: config.name }, 'Upstash Redis not configured – rate limit skipped')
    }
    return null
  }

  const ip = getClientIp(req)
  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip)
    if (success) return null

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    logger.warn({ ip, limiter: config.name, retryAfter }, `Rate limit exceeded [${config.name}]`)

    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
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
    // Never block traffic if Upstash is unavailable.
    logger.error({ err, limiter: config.name }, 'Rate limiter error')
    return null
  }
}

// Pre-configured limiters
const GLOBAL: LimiterConfig = { name: 'global', limit: 100, window: '1 m' }
const AUTH: LimiterConfig = { name: 'auth', limit: 5, window: '15 m' }

export function rateLimit(req: NextRequest) {
  return applyLimit(req, GLOBAL)
}

export function authRateLimit(req: NextRequest) {
  return applyLimit(req, AUTH)
}

/** Custom limiter for one-off use in routes */
export function customRateLimit(req: NextRequest, config: LimiterConfig) {
  return applyLimit(req, config)
}