export type AnalyticsPeriod = 'today' | '7d' | '30d' | '90d' | '1y'

export function getPeriodRange(period: string | null | undefined): {
  now: Date
  start: Date
  period: AnalyticsPeriod
} {
  const now = new Date()
  const start = new Date()
  const p = (period ?? '30d') as AnalyticsPeriod

  switch (p) {
    case 'today': start.setHours(0, 0, 0, 0); break
    case '7d':    start.setDate(now.getDate() - 7); break
    case '90d':   start.setDate(now.getDate() - 90); break
    case '1y':    start.setFullYear(now.getFullYear() - 1); break
    case '30d':
    default:      start.setDate(now.getDate() - 30); break
  }

  return { now, start, period: p }
}
