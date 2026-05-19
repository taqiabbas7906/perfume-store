import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Builds and verifies HMAC-signed unsubscribe tokens for newsletter emails.
 *
 * The token format is `b64url(email):b64url(sigPrefix)` where `sigPrefix` is
 * the first 16 bytes of `HMAC-SHA256(secret, email)`. 16 bytes / 128 bits is
 * plenty to prevent a third party with someone's email from forging a valid
 * token — and short enough to keep the unsubscribe URL readable.
 *
 * `COOKIE_SECRET` is reused as the signing key — it already exists in every
 * environment and is server-only. No new env var to set up.
 */

function secret(): Buffer {
  const raw = process.env.COOKIE_SECRET ?? process.env.UNSUBSCRIBE_SECRET ?? ''
  if (!raw) {
    throw new Error('COOKIE_SECRET (or UNSUBSCRIBE_SECRET) must be set')
  }
  return Buffer.from(raw, 'utf8')
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64')
}

function sigFor(email: string): Buffer {
  return createHmac('sha256', secret()).update(email.toLowerCase()).digest().subarray(0, 16)
}

export function makeUnsubscribeToken(email: string): string {
  const e = email.trim().toLowerCase()
  return `${b64url(Buffer.from(e, 'utf8'))}.${b64url(sigFor(e))}`
}

/** Returns the normalised email if the token is valid, otherwise null. */
export function verifyUnsubscribeToken(token: string): string | null {
  const [encEmail, encSig] = token.split('.')
  if (!encEmail || !encSig) return null
  let email: string
  let sig: Buffer
  try {
    email = fromB64url(encEmail).toString('utf8').toLowerCase()
    sig = fromB64url(encSig)
  } catch {
    return null
  }
  const expected = sigFor(email)
  if (sig.length !== expected.length) return null
  try {
    if (!timingSafeEqual(sig, expected)) return null
  } catch {
    return null
  }
  return email
}
