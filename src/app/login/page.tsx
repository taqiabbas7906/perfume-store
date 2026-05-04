'use client'

import { auth } from '@/lib/firebase'
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

type AuthMode = 'login' | 'register' | 'forgot'

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

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  // src/app/login/page.tsx — change saveUserToDB to use Authorization header
const saveUserToDB = async (token: string) => {
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

  const handleGoogle = async () => {
    try {
      setAuthLoading(true)
      setError('')
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const token = await result.user.getIdToken()
      await saveUserToDB(token)
      router.push('/')
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign in was cancelled')
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
      let result
      if (mode === 'register') {
        result = await createUserWithEmailAndPassword(auth, email, password)
      } else {
        result = await signInWithEmailAndPassword(auth, email, password)
      }
      const token = await result.user.getIdToken()
      await saveUserToDB(token)
      router.push('/')
    } catch (err: any) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email. Please login with Google.')
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.')
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.')
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email. Please login.')
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        setError(err.message)
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess('Password reset email sent. Please check your inbox.')
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError('Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        Loading...
      </div>
    )
  }

  return (
    <main style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>

      <h1>
        {mode === 'login' && 'Login'}
        {mode === 'register' && 'Register'}
        {mode === 'forgot' && 'Forgot Password'}
      </h1>

      {error && (
        <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>
      )}

      {success && (
        <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>
      )}

      {mode === 'forgot' ? (
        <form onSubmit={handleForgotPassword}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button
            type="submit"
            disabled={authLoading}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          >
            {authLoading ? 'Please wait...' : 'Send Reset Email'}
          </button>
          <p
            onClick={() => {
              setMode('login')
              setError('')
              setSuccess('')
            }}
            style={{ cursor: 'pointer', color: 'blue' }}
          >
            Back to Login
          </p>
        </form>
      ) : (
        <>
          <form onSubmit={handleEmailAuth}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            {mode === 'register' && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              />
            )}
            <button
              type="submit"
              disabled={authLoading}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            >
              {authLoading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Login'
                : 'Register'}
            </button>
          </form>

          <button
            onClick={handleGoogle}
            disabled={authLoading}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          >
            Continue with Google
          </button>

          {mode === 'login' && (
            <p
              onClick={() => {
                setMode('forgot')
                setError('')
                setSuccess('')
              }}
              style={{ cursor: 'pointer', color: 'blue', marginBottom: '10px' }}
            >
              Forgot password?
            </p>
          )}

          <p
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
              setSuccess('')
            }}
            style={{ cursor: 'pointer', color: 'blue' }}
          >
            {mode === 'login'
              ? 'No account? Register'
              : 'Already have an account? Login'}
          </p>
        </>
      )}
    </main>
  )
}