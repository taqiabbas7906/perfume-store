// src/lib/rateLimit.ts
import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let globalRateLimiter: Ratelimit | null = null;
let authRateLimiter: Ratelimit | null = null;

function getRedisClient() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function getGlobalLimiter() {
  if (!globalRateLimiter) {
    globalRateLimiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      prefix: "rl:global",
    });
  }
  return globalRateLimiter;
}

function getAuthLimiter() {
  if (!authRateLimiter) {
    authRateLimiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "rl:auth",
    });
  }
  return authRateLimiter;
}

function getTrustedIp(req: NextRequest): string {
  // Vercel sets x-real-ip from their edge, not from user-controlled headers
  // Never trust x-forwarded-for unless behind a known, trusted proxy
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback for local dev
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the LAST entry (most recent trusted proxy), not first
    const ips = forwarded.split(",").map((s) => s.trim());
    return ips[ips.length - 1];
  }

  return "unknown";
}

export async function rateLimit(
  req: NextRequest,
): Promise<NextResponse | null> {
  const ip = getTrustedIp(req);
  const { success, limit, remaining, reset } =
    await getGlobalLimiter().limit(ip);

  if (!success) {
    logger.warn({ ip }, `Rate limit exceeded [${name}]`);
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      },
    );
  }
  return null;
}

export async function authRateLimit(
  req: NextRequest,
): Promise<NextResponse | null> {
  const ip = getTrustedIp(req);
  const { success, reset } = await getAuthLimiter().limit(ip);

  if (!success) {
    logger.warn({ ip }, `Rate limit exceeded [${name}]`);
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      },
    );
  }
  return null;
}
