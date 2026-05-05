import { NextRequest } from 'next/server'
import crypto from 'crypto'

const HEADER_KEYS = [
  'idempotency-key',
  'x-idempotency-key',
] as const

const KEY_REGEX = /^[A-Za-z0-9_\-:.]{8,128}$/

/**
 * Pull an idempotency key from the request, validating it against a
 * conservative regex so adversaries can't poison our key store with
 * bizarre values. Falls back to the `bodyKey` (e.g. `body.idempotencyKey`)
 * when no header is present, and finally generates a server-side UUID
 * if neither is provided (last resort — clients should always send one).
 */
export function getIdempotencyKey(
  req: NextRequest,
  bodyKey?: string
): { key: string; source: 'header' | 'body' | 'server' } {
  for (const h of HEADER_KEYS) {
    const v = req.headers.get(h)
    if (v && KEY_REGEX.test(v.trim())) {
      return { key: v.trim(), source: 'header' }
    }
  }
  if (bodyKey && KEY_REGEX.test(bodyKey)) {
    return { key: bodyKey, source: 'body' }
  }
  return { key: crypto.randomUUID(), source: 'server' }
}