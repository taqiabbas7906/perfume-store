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

type AuthMode = 'login' | 'register' | 'forgot'

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
])

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const syncUserToDB = async (token: string) => {
    const res = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error('Sync failed')
  }
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await getRedirectResult(auth)
        if (cancelled || !res) return

        const token = await res.user.getIdToken()
        await syncUserToDB(token)
        router.push('/')
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!loading && user) router.push('/')
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
      router.push('/')
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err && 'code' in err
          ? (err as { code?: string }).code
          : undefined

      if (code && POPUP_FALLBACK_CODES.has(code)) {
        try {
          await signInWithRedirect(auth, provider)
          return
        } catch {
          setError('Google sign in was cancelled. Please try again.')
        }
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
    setSuccess('')

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

      router.push('/')
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err && 'code' in err
          ? (err as { code?: string }).code
          : undefined

      const msg =
        {
          'auth/account-exists-with-different-credential':
            'An account already exists with this email.',
          'auth/wrong-password': 'Incorrect password.',
          'auth/user-not-found': 'No account found.',
          'auth/email-already-in-use': 'Email already in use.',
        }[code ?? ''] ?? 'Authentication failed'

      setError(msg)
    } finally {
      setAuthLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading...</div>
  }

  return (
    <main style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>{mode === 'login' ? 'Login' : 'Register'}</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleEmailAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {mode === 'register' && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}

        <button type="submit" disabled={authLoading}>
          {authLoading ? 'Please wait...' : 'Submit'}
        </button>
      </form>

      <button onClick={handleGoogle} disabled={authLoading}>
        Continue with Google
      </button>
    </main>
  )
}