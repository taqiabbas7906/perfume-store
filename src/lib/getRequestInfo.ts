import { NextRequest } from 'next/server'

export function getRequestInfo(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = req.headers.get('x-real-ip') || (forwarded?.split(',').pop()?.trim()) || 'unknown'

  // Cloudflare provides these headers without external calls
  const country = req.headers.get('cf-ipcountry') || 'unknown'
  const city = req.headers.get('cf-ipcity') || 'unknown'

  return {
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
    country,
    city,
    timestamp: new Date(),
  }
}