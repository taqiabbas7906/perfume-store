import { auth } from '@/lib/firebase'

function isFormDataBody(body: BodyInit | null | undefined) {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function buildHeaders(options: RequestInit) {
  const headers = new Headers(options.headers)
  if (!isFormDataBody(options.body as BodyInit | null | undefined)) {
    headers.set(
      'Content-Type',
      headers.get('Content-Type') ?? 'application/json',
    )
  }
  return headers
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }

  const token = await user.getIdToken()
  const headers = buildHeaders(options)
  headers.set('Authorization', `Bearer ${token}`)
  headers.delete('x-cart-session')

  return fetch(url, {
    ...options,
    headers,
  })
}

/** Reads an existing guest session ID without creating a new one. */
export function peekGuestSessionId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('cartSessionId') ?? ''
}

/** Gets or creates a persistent guest session ID in localStorage */
export function getGuestSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('cartSessionId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('cartSessionId', id)
  }
  return id
}

export function clearGuestSessionId() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('cartSessionId')
}

/**
 * Works for both logged-in users (Bearer token) and guests (x-cart-session).
 * Use this everywhere instead of authFetch so guest checkout works.
 */
export async function smartFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const user = auth.currentUser

  if (user) {
    const token = await user.getIdToken()
    const headers = buildHeaders(options)
    headers.set('Authorization', `Bearer ${token}`)
    headers.delete('x-cart-session')

    return fetch(url, {
      ...options,
      headers,
    })
  }

  const sessionId = getGuestSessionId()
  const headers = buildHeaders(options)
  headers.set('x-cart-session', sessionId)

  return fetch(url, {
    ...options,
    headers,
  })
}
