import { NextRequest } from 'next/server'
import { UAParser } from 'ua-parser-js'

export interface RequestInfo {
  ipAddress: string
  userAgent: string
  browser: string
  device: string
  os: string
  country: string
  city: string
  timestamp: Date
}

/**
 * Extracts request metadata for audit logs. Geographic info comes from
 * Cloudflare / Vercel headers when present, otherwise \"unknown\". We never
 * call external IP-geolocation APIs (latency + privacy).
 */
export function getRequestInfo(req: NextRequest): RequestInfo {
  const realIp = req.headers.get('x-real-ip')
  const forwarded = req.headers.get('x-forwarded-for')
  const ip =
    realIp?.trim() ||
    forwarded?.split(',').pop()?.trim() ||
    'unknown'

  const userAgent = req.headers.get('user-agent') || 'unknown'
  const ua = UAParser(userAgent)

  // Cloudflare-specific headers
  const country =
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    'unknown'
  const city =
    req.headers.get('cf-ipcity') ||
    req.headers.get('x-vercel-ip-city') ||
    'unknown'

  return {
    ipAddress: ip,
    userAgent,
    browser: `${ua.browser.name ?? 'unknown'} ${ua.browser.version ?? ''}`.trim(),
    device: ua.device.type || 'desktop',
    os: `${ua.os.name ?? 'unknown'} ${ua.os.version ?? ''}`.trim(),
    country,
    city,
    timestamp: new Date(),
  }
}