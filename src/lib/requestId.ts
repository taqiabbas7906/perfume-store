import type { NextRequest } from 'next/server'
import crypto from 'crypto'
import { logger, type Logger } from './logger'

const HEADER = 'x-request-id'
const PATTERN = /^[A-Za-z0-9_-]{8,128}$/

export function getRequestId(req: NextRequest): string {
  const incoming = req.headers.get(HEADER)?.trim()
  if (incoming && PATTERN.test(incoming)) return incoming
  return crypto.randomUUID()
}

export function withRequestLogger(req: NextRequest): { requestId: string; log: Logger } {
  const requestId = getRequestId(req)
  return {
    requestId,
    log: logger.child({ requestId, route: req.nextUrl.pathname, method: req.method }),
  }
}
