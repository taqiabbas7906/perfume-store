'use client'

import { auth } from '@/lib/firebase'
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

type AuthMode = 'login' | 'register'

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
])

async function syncUserToDB(token: string) {
  const res = await fetch('/api/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  })
  if (!res.ok) throw new Error('Sync failed')
}

async function mergeGuestCart(token: string) {
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('cartSessionId') : null
  if (!sessionId) return

  try {
    await fetch('/api/cart/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId }),
    })
    // Clear guest session from localStorage regardless of merge result
    localStorage.removeItem('cartSessionId')
  } catch {
    // Non-fatal — user cart still works
    localStorage.removeItem('cartSessionId')
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode]                     = useState<AuthMode>('login')
  const [error, setError]                   = useState('')
  const [authLoading, setAuthLoading]       = useState(false)

  // Check for redirect result (Google redirect flow)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await getRedirectResult(auth)
        if (cancelled || !res) return
        const token = await res.user.getIdToken()
        await syncUserToDB(token)
        await mergeGuestCart(token)
        const dest = sessionStorage.getItem('checkoutRedirect') ?? '/'
        sessionStorage.removeItem('checkoutRedirect')
        router.push(dest)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [router])

  // Already logged in — redirect away
  useEffect(() => {
    if (!loading && user) {
      const dest = sessionStorage.getItem('checkoutRedirect') ?? '/'
      sessionStorage.removeItem('checkoutRedirect')
      router.push(dest)
    }
  }, [user, loading, router])

  const handleGoogle = async () => {
    setAuthLoading(true)
    setError('')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      const result = await signInWithPopup(auth, provider)
      const token = await result.user.getIdToken()
      await syncUserToDB(token)
      await mergeGuestCart(token)
      const dest = sessionStorage.getItem('checkoutRedirect') ?? '/'
      sessionStorage.removeItem('checkoutRedirect')
      router.push(dest)
    } catch (err: unknown) {
      const code = (err as any)?.code as string | undefined
      if (code && POPUP_FALLBACK_CODES.has(code)) {
        try { await signInWithRedirect(auth, provider); return }
        catch { setError('Google sign in was cancelled.') }
      } else {
        setError('Google sign in failed. Please try again.')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match')
      setAuthLoading(false)
      return
    }

    try {
      const result =
        mode === 'register'
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password)

      const token = await result.user.getIdToken()
      await syncUserToDB(token)
      await mergeGuestCart(token)
      const dest = sessionStorage.getItem('checkoutRedirect') ?? '/'
      sessionStorage.removeItem('checkoutRedirect')
      router.push(dest)
    } catch (err: unknown) {
      const code = (err as any)?.code as string | undefined
      const msg =
        ({
          'auth/wrong-password': 'Incorrect password.',
          'auth/user-not-found': 'No account found.',
          'auth/email-already-in-use': 'Email already in use.',
          'auth/weak-password': 'Password must be at least 6 characters.',
          'auth/account-exists-with-different-credential': 'An account already exists with this email.',
        } as Record<string, string>)[code ?? ''] ?? 'Authentication failed'
      setError(msg)
    } finally {
      setAuthLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-gray-900 font-medium underline hover:no-underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email" required placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            type="password" required placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          {mode === 'register' && (
            <input
              type="password" required placeholder="Confirm password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          )}
          <button
            type="submit" disabled={authLoading}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {authLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={handleGoogle} disabled={authLoading}
          className="w-full py-2.5 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
