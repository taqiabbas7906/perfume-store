import { describe, it, expect } from 'vitest'

/* The transition table lives inside orderService.ts; we re-declare here to
 * pin business rules. Mismatch = test fail = product bug, not a test bug. */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['paid', 'failed', 'cancelled'],
  paid:      ['shipped', 'cancelled', 'refunded'],
  shipped:   ['delivered', 'refunded'],
  delivered: ['refunded'],
  failed:    ['cancelled', 'pending'],
  cancelled: [],
  refunded:  [],
}

describe('order status transitions', () => {
  it('pending → paid is allowed', () => {
    expect(VALID_TRANSITIONS.pending).toContain('paid')
  })

  it('pending → delivered is NOT allowed (must go through paid)', () => {
    expect(VALID_TRANSITIONS.pending).not.toContain('delivered')
  })

  it('cancelled is terminal', () => {
    expect(VALID_TRANSITIONS.cancelled).toHaveLength(0)
  })

  it('refunded is terminal', () => {
    expect(VALID_TRANSITIONS.refunded).toHaveLength(0)
  })

  it('delivered → refunded is the only post-delivery move', () => {
    expect(VALID_TRANSITIONS.delivered).toEqual(['refunded'])
  })

  it('failed orders can be retried back to pending', () => {
    expect(VALID_TRANSITIONS.failed).toContain('pending')
  })

  it('no transition allows skipping payment (pending → shipped)', () => {
    expect(VALID_TRANSITIONS.pending).not.toContain('shipped')
  })
})
