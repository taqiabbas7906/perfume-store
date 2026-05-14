import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { verifySquareWebhook } from '@/lib/square'

const KEY = 'test-signing-key-32-bytes-or-longer'
const URL = 'https://example.com/api/webhooks/square'
const BODY = JSON.stringify({ event_id: 'evt_1', type: 'payment.updated' })

function sign(key: string, url: string, body: string) {
  return crypto.createHmac('sha256', key).update(url + body).digest('base64')
}

describe('verifySquareWebhook', () => {
  it('accepts a valid HMAC signature', async () => {
    const sig = sign(KEY, URL, BODY)
    await expect(verifySquareWebhook({ rawBody: BODY, signature: sig, notificationUrl: URL, signatureKey: KEY }))
      .resolves.toBe(true)
  })

  it('rejects a tampered body', async () => {
    const sig = sign(KEY, URL, BODY)
    const tampered = BODY.replace('evt_1', 'evt_2')
    await expect(verifySquareWebhook({ rawBody: tampered, signature: sig, notificationUrl: URL, signatureKey: KEY }))
      .resolves.toBe(false)
  })

  it('rejects a signature with the wrong key', async () => {
    const sig = sign('different-key', URL, BODY)
    await expect(verifySquareWebhook({ rawBody: BODY, signature: sig, notificationUrl: URL, signatureKey: KEY }))
      .resolves.toBe(false)
  })

  it('rejects non-string signatures (NoSQL guard)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(verifySquareWebhook({ rawBody: BODY, signature: {} as any, notificationUrl: URL, signatureKey: KEY }))
      .resolves.toBe(false)
  })

  it('rejects empty signature', async () => {
    await expect(verifySquareWebhook({ rawBody: BODY, signature: '', notificationUrl: URL, signatureKey: KEY }))
      .resolves.toBe(false)
  })

  it('rejects wrong-length signature', async () => {
    await expect(verifySquareWebhook({ rawBody: BODY, signature: 'tooshort', notificationUrl: URL, signatureKey: KEY }))
      .resolves.toBe(false)
  })
})
