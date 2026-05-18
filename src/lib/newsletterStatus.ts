export interface NewsletterStatusDetail {
  email: string
  subscribed: boolean
}

const EVENT_NAME = 'newsletter-status-change'

export function normalizeNewsletterEmail(email: string) {
  return email.trim().toLowerCase()
}

export function readStoredNewsletterStatus(email: string) {
  if (typeof window === 'undefined') return null
  const normalized = normalizeNewsletterEmail(email)
  if (!normalized) return null
  const value = window.localStorage.getItem(`newsletter:${normalized}`)
  if (value === 'subscribed') return true
  if (value === 'unsubscribed') return false
  return null
}

export function publishNewsletterStatus(email: string, subscribed: boolean) {
  if (typeof window === 'undefined') return
  const normalized = normalizeNewsletterEmail(email)
  if (!normalized) return
  window.localStorage.setItem(
    `newsletter:${normalized}`,
    subscribed ? 'subscribed' : 'unsubscribed',
  )
  window.dispatchEvent(
    new CustomEvent<NewsletterStatusDetail>(EVENT_NAME, {
      detail: { email: normalized, subscribed },
    }),
  )
}

export function subscribeToNewsletterStatus(
  handler: (detail: NewsletterStatusDetail) => void,
) {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: Event) => {
    handler((event as CustomEvent<NewsletterStatusDetail>).detail)
  }
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
