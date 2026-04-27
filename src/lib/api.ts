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