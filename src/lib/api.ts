import { auth } from '@/lib/firebase'

export async function authFetch(
  url: string,
  options: RequestInit = {}
) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Not authenticated')
  }
  const token = await user.getIdToken(true)

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
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

/**
 * Works for both logged-in users (Bearer token) and guests (x-cart-session).
 * Use this everywhere instead of authFetch so guest checkout works.
 */
export async function smartFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser

  if (user) {
    const token = await user.getIdToken(true)
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  }

  // Guest path — send session ID header
  const sessionId = getGuestSessionId()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-cart-session': sessionId,
      ...options.headers,
    },
  })
}