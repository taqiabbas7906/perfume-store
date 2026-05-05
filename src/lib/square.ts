import { SquareClient, SquareEnvironment } from 'square'
import crypto from 'crypto'
import type { PaymentStatus } from '@/types'

let _client: SquareClient | null = null

/* ───────────────────────────────────────────── */

export function getSquareClient(): SquareClient {
  if (_client) return _client

  const token = process.env.SQUARE_ACCESS_TOKEN
  if (!token) throw new Error('SQUARE_ACCESS_TOKEN missing')

  const environment =
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox

  _client = new SquareClient({ token, environment })
  return _client
}

/* ───────────────────────────────────────────── */

export function getSquareLocationId(): string {
  const id = process.env.SQUARE_LOCATION_ID
  if (!id) throw new Error('SQUARE_LOCATION_ID missing')
  return id
}

/* ───────────────────────────────────────────── */

export function isSquareConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID
  )
}

/* ───────────────────────────────────────────── */
/* MONEY HELPERS */
/* ───────────────────────────────────────────── */

export function toMinorUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 100))
}

/* ───────────────────────────────────────────── */
/* STATUS MAPPING */
/* ───────────────────────────────────────────── */

export function mapSquareStatus(status?: string): PaymentStatus {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
      return 'completed'
    case 'APPROVED':
    case 'AUTHORIZED':
      return 'authorized'
    case 'PENDING':
      return 'pending'
    case 'CANCELED':
    case 'CANCELLED':
      return 'canceled'
    case 'FAILED':
      return 'failed'
    default:
      return 'pending'
  }
}

/* ───────────────────────────────────────────── */
/* WEBHOOK VERIFICATION (FIX FOR YOUR ERROR) */
/* ───────────────────────────────────────────── */

export async function verifySquareWebhook(args: {
  rawBody: string
  signature: string
  notificationUrl: string
  signatureKey: string
}): Promise<boolean> {
  try {
    // Square uses HMAC-SHA256
    const hmac = crypto
      .createHmac('sha256', args.signatureKey)
      .update(args.notificationUrl + args.rawBody)
      .digest('base64')

    return hmac === args.signature
  } catch {
    return false
  }
}