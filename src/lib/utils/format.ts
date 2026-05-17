/**
 * Currency formatter — defaults to USD, no decimals on whole dollars
 * keeps consistency across cart, product pages, checkout, etc.
 */
export function formatPrice(
  value: number | string | null | undefined,
  currency: string = 'USD',
  locale: string = 'en-US',
): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0)
  if (!Number.isFinite(n)) return '$0.00'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function classNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ')
}
