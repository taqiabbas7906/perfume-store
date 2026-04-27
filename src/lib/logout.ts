import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'

export async function logout() {
  try {
    await signOut(auth)

    await fetch('/api/auth/logout', {
      method: 'POST',
    })

    window.location.href = '/login'
  } catch (error) {
    console.error('Logout failed:', error)
  }
}