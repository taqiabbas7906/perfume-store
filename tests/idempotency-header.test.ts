import { describe, it, expect } from 'vitest'
import { getIdempotencyKey } from '@/lib/idempotencyHeader'

function fakeReq(headers: Record<string, string>) {
  return {
    headers: {
      get: (k: string) => headers[k.toLowerCase()] ?? null,
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('getIdempotencyKey', () => {
  it('accepts a valid Idempotency-Key header', () => {
    const r = getIdempotencyKey(fakeReq({ 'idempotency-key': 'abc-123-XYZ:9.test' }))
    expect(r.source).toBe('header')
    expect(r.key).toBe('abc-123-XYZ:9.test')
  })

  it('accepts X-Idempotency-Key fallback', () => {
    const r = getIdempotencyKey(fakeReq({ 'x-idempotency-key': '12345678' }))
    expect(r.source).toBe('header')
  })

  it('rejects a too-short header value and falls back to server-generated UUID', () => {
    const r = getIdempotencyKey(fakeReq({ 'idempotency-key': 'short' }))
    expect(r.source).toBe('server')
    expect(r.key).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rejects illegal characters and falls back', () => {
    const r = getIdempotencyKey(fakeReq({ 'idempotency-key': 'has spaces and !!!' }))
    expect(r.source).toBe('server')
  })

  it('uses body key when no header is set', () => {
    const r = getIdempotencyKey(fakeReq({}), 'body-key-12345')
    expect(r.source).toBe('body')
    expect(r.key).toBe('body-key-12345')
  })

  it('rejects body key shorter than 8 chars', () => {
    const r = getIdempotencyKey(fakeReq({}), 'short')
    expect(r.source).toBe('server')
  })
})
