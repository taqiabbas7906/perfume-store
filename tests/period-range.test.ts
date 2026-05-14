import { describe, it, expect } from 'vitest'
import { getPeriodRange } from '@/lib/utils/period'

describe('getPeriodRange', () => {
  it('defaults to 30d when no period is given', () => {
    const { now, start, period } = getPeriodRange(null)
    expect(period).toBe('30d')
    const days = (now.getTime() - start.getTime()) / 86_400_000
    expect(days).toBeGreaterThan(29)
    expect(days).toBeLessThan(31)
  })

  it('handles "today" by clamping start to midnight', () => {
    const { now, start } = getPeriodRange('today')
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(now.getTime()).toBeGreaterThanOrEqual(start.getTime())
  })

  it('handles 7d', () => {
    const { now, start } = getPeriodRange('7d')
    const days = (now.getTime() - start.getTime()) / 86_400_000
    expect(days).toBeGreaterThan(6.5)
    expect(days).toBeLessThan(7.5)
  })

  it('handles 1y', () => {
    const { now, start } = getPeriodRange('1y')
    expect(now.getFullYear() - start.getFullYear()).toBe(1)
  })

  it('treats unknown period as 30d', () => {
    expect(getPeriodRange('garbage').period).toBe('garbage')
    const { now, start } = getPeriodRange('garbage')
    const days = (now.getTime() - start.getTime()) / 86_400_000
    expect(days).toBeGreaterThan(29)
    expect(days).toBeLessThan(31)
  })
})
