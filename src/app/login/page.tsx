'use client'

import { auth } from '@/lib/firebase'
import {
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { clearGuestSessionId, peekGuestSessionId } from '@/lib/api'
import { LoginPageSkeleton } from '@/components/ui/Skeleton'

type AuthMode = 'login' | 'register' | 'forgot'

async function syncUserToDB(token: string, name?: string) {
  const res = await fetch('/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    // Pass the registration name as a fallback so the server uses it when
    // the Firebase token's displayName claim hasn't propagated yet.
    body: JSON.stringify(name ? { name } : {}),
  })
  if (!res.ok) throw new Error('Sync failed')
}

async function mergeGuestCart(token: string) {
  const sessionId = peekGuestSessionId()
  if (!sessionId) return
  try {
    const res = await fetch('/api/cart/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    })
    if (res.ok) clearGuestSessionId()
  } catch {
    /* ignore */
  }
}

function getRedirectDest() {
  const dest = sessionStorage.getItem('checkoutRedirect') ?? '/'
  sessionStorage.removeItem('checkoutRedirect')
  return dest
}

const inputCls =
  'w-full px-4 py-3.5 border border-[var(--color-border)] text-sm text-[var(--color-ink)] placeholder-gray-300 outline-none transition-all duration-200 focus:border-[var(--color-gold)] bg-white'
const labelCls =
  'block text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--color-ink)] mb-2'

interface FirebaseAuthError {
  code?: string
  message?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await getRedirectResult(auth)
        if (cancelled || !res) return
        const token = await res.user.getIdToken()
        await syncUserToDB(token)
        await mergeGuestCart(token)
        router.push(getRedirectDest())
      } catch (err) {
        if (cancelled) return
        const code = (err as FirebaseAuthError)?.code ?? ''
        const REDIRECT_ERRORS: Record<string, string> = {
          'auth/account-exists-with-different-credential':
            'An account already exists with this email using a different sign-in method.',
          'auth/user-disabled': 'This account has been disabled.',
          'auth/operation-not-allowed': 'This sign-in method is not enabled.',
          'auth/popup-closed-by-user': '',
          'auth/cancelled-popup-request': '',
        }
        const msg = REDIRECT_ERRORS[code]
        if (msg !== undefined) {
          if (msg) setError(msg)
        } else if (code) {
          setError('Sign-in failed. Please try again.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!loading && user && !authLoading) router.push(getRedirectDest())
  }, [user, loading, authLoading, router])

  const afterAuth = async (token: string, registrationName?: string) => {
    await syncUserToDB(token, registrationName)
    await mergeGuestCart(token)
    router.push(getRedirectDest())
  }

  const handleSocialAuth = async (
    providerName: 'google' | 'facebook' | 'apple',
  ) => {
    setAuthLoading(true)
    setError('')

    const friendlyName =
      providerName.charAt(0).toUpperCase() + providerName.slice(1)

    const SOCIAL_ERRORS: Record<string, string> = {
      'auth/account-exists-with-different-credential':
        'An account already exists with this email using a different sign-in method.',
      'auth/popup-blocked':
        'Popup was blocked. Please allow popups for this site and try again.',
      'auth/popup-closed-by-user': `${friendlyName} sign-in was cancelled.`,
      'auth/cancelled-popup-request': `${friendlyName} sign-in was cancelled.`,
      'auth/user-disabled':
        'This account has been disabled. Please contact support.',
      'auth/operation-not-allowed': `${friendlyName} sign-in is not enabled. Please contact support.`,
      'auth/network-request-failed':
        'Network error. Please check your connection and try again.',
      'auth/internal-error': `${friendlyName} sign-in failed. Please try again.`,
      'auth/unauthorized-domain':
        'This domain is not authorised for OAuth. Contact support.',
    }

    const resolveError = (err: unknown, fallback: string) => {
      const code = (err as FirebaseAuthError)?.code ?? ''
      const msg = SOCIAL_ERRORS[code]
      setError(msg !== undefined ? msg : fallback)
    }

    try {
      if (providerName === 'apple') {
        const provider = new OAuthProvider('apple.com')
        provider.addScope('email')
        provider.addScope('name')
        provider.setCustomParameters({ response_mode: 'form_post' })
        const result = await signInWithPopup(auth, provider)
        await afterAuth(await result.user.getIdToken())
        return
      }

      if (providerName === 'facebook') {
        const provider = new FacebookAuthProvider()
        provider.addScope('email')
        provider.setCustomParameters({ display: 'popup' })
        const result = await signInWithPopup(auth, provider)
        await afterAuth(await result.user.getIdToken())
        return
      }

      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      await afterAuth(await result.user.getIdToken())
    } catch (err) {
      resolveError(err, `${friendlyName} sign-in failed. Please try again.`)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    setInfo('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match')
      setAuthLoading(false)
      return
    }

    const trimmedName = name.trim()
    if (mode === 'register' && trimmedName.length < 2) {
      setError('Please enter your full name.')
      setAuthLoading(false)
      return
    }

    try {
      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        // Persist the entered name to the Firebase profile so future logins
        // (and the token's `name` claim) carry it. Force a token refresh so
        // the very first /api/auth/sync call sees the updated displayName
        // instead of falling back to the email prefix.
        await updateProfile(result.user, { displayName: trimmedName })
        const token = await result.user.getIdToken(true)
        await afterAuth(token, trimmedName)
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password)
        await afterAuth(await result.user.getIdToken())
      }
    } catch (err) {
      const code = (err as FirebaseAuthError)?.code
      const msgs: Record<string, string> = {
        'auth/wrong-password': 'Incorrect password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/email-already-in-use': 'Email already in use.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests':
          'Too many attempts. Please try again later.',
      }
      setError(
        msgs[code ?? ''] ?? 'Authentication failed. Please try again.',
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    setInfo('')
    try {
      await sendPasswordResetEmail(auth, email)
      setInfo('Reset link sent! Check your email.')
    } catch (err) {
      const code = (err as FirebaseAuthError)?.code
      setError(
        code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : 'Failed to send reset email.',
      )
    } finally {
      setAuthLoading(false)
    }
  }

  if (loading || !mounted) {
    return <LoginPageSkeleton />
  }

  return (
    <main className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-2">
      {/* ── Visual Panel ── */}
      <div className="relative hidden lg:flex flex-col justify-end p-12 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=900&h=1200&fit=crop&q=80"
          alt="Inscentives Perfume"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-cream-200)]/95 via-[var(--color-cream-200)]/40 to-[var(--color-cream-200)]/10" />

        <Link
          href="/"
          className="absolute top-12 left-12 flex flex-col items-start group z-10"
        >
          <div className="w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <i className="ri-leaf-line text-2xl text-[var(--color-gold)]" />
          </div>
          <span className="tracking-[0.3em] uppercase text-xs font-semibold text-[var(--color-ink)] mt-0.5">
            Inscentives
          </span>
          <span className="tracking-[0.2em] uppercase text-[9px] text-[var(--color-gold)] -mt-0.5">
            Perfume
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="w-8 h-[1px] bg-[var(--color-gold)] mb-5" />
          <p className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold mb-3">
            Welcome to Inscentives
          </p>
          <p className="font-serif text-5xl md:text-6xl font-light text-[var(--color-ink)] leading-[1.05] mb-4">
            The art of
            <br />
            <span className="font-bold italic">rare fragrance</span>
          </p>
          <p className="text-[var(--color-ink-soft)] text-sm font-light tracking-wide leading-relaxed max-w-sm">
            Curated from the world&apos;s finest houses. Authentic scents,
            honest prices, always free shipping.
          </p>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md animate-fadeIn">
          {/* Mobile logo */}
          <Link
            href="/"
            className="flex flex-col items-center mb-10 lg:hidden"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <i className="ri-leaf-line text-2xl text-[var(--color-gold)]" />
            </div>
            <span className="tracking-[0.3em] uppercase text-xs font-semibold text-[var(--color-ink)] mt-0.5">
              Inscentives
            </span>
            <span className="tracking-[0.2em] uppercase text-[9px] text-[var(--color-gold)] -mt-0.5">
              Perfume
            </span>
          </Link>

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setInfo('')
                }}
                className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gray-400 hover:text-[var(--color-gold)] transition-colors mb-7"
              >
                <i className="ri-arrow-left-line text-sm" />
                Back to sign in
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
                <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-semibold">
                  Account Recovery
                </p>
              </div>
              <h1 className="font-serif text-4xl font-light text-[var(--color-ink)] mb-2">
                Reset <span className="font-bold">password</span>
              </h1>
              <p className="text-xs text-gray-400 tracking-wide mb-8">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {error && (
                <p className="text-xs text-red-400 bg-red-50 border border-red-100 px-4 py-3 tracking-wide mb-5">
                  {error}
                </p>
              )}
              {info && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 tracking-wide mb-5 flex items-center gap-2">
                  <i className="ri-checkbox-circle-line" />
                  {info}
                </p>
              )}

              <form onSubmit={handleForgot} className="space-y-5">
                <div>
                  <label htmlFor="forgot-email" className={labelCls}>
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[11px] tracking-[0.3em] uppercase font-bold py-4 transition-all duration-300 disabled:opacity-60"
                >
                  {authLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          {/* ── LOGIN / REGISTER ── */}
          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
                <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-semibold">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </p>
              </div>
              <h1 className="font-serif text-4xl font-light text-[var(--color-ink)] mb-2">
                {mode === 'login' ? (
                  <>
                    Sign <span className="font-bold">in</span>
                  </>
                ) : (
                  <>
                    Join <span className="font-bold">Inscentives</span>
                  </>
                )}
              </h1>
              <p className="text-xs text-gray-400 tracking-wide mb-8">
                {mode === 'login' ? 'New here? ' : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login')
                    setError('')
                    setInfo('')
                  }}
                  className="text-[var(--color-gold)] hover:text-[var(--color-ink)] font-semibold underline-offset-2 hover:underline transition-colors"
                >
                  {mode === 'login' ? 'Create account' : 'Sign in'}
                </button>
              </p>

              {/* Social auth — on mobile we show only the brand glyphs at a
                  larger, fully tappable size; on sm+ widths the labels
                  appear next to them. The previous 3-column row was so
                  cramped on phones that the Facebook word-mark wrapped
                  underneath its icon and hid it visually. */}
              <div className="grid grid-cols-3 gap-2.5 mb-6">
                <button
                  type="button"
                  onClick={() => handleSocialAuth('google')}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-2 min-h-[48px] px-2 sm:px-3 py-3 border border-[var(--color-border)] hover:border-[var(--color-gold)] text-[var(--color-ink)] hover:text-[var(--color-gold)] text-[10px] tracking-[0.15em] uppercase font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Continue with Google"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="shrink-0 sm:w-[14px] sm:h-[14px]"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="hidden sm:inline">Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialAuth('facebook')}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-2 min-h-[48px] px-2 sm:px-3 py-3 border border-[var(--color-border)] hover:border-[var(--color-gold)] text-[var(--color-ink)] hover:text-[var(--color-gold)] text-[10px] tracking-[0.15em] uppercase font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Continue with Facebook"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    className="shrink-0 sm:w-[14px] sm:h-[14px]"
                    aria-hidden="true"
                  >
                    {/* Explicit fill on the path (not the svg root) so the
                        button's hover `currentColor` shift can't accidentally
                        re-paint the Facebook glyph. */}
                    <path
                      fill="#1877F2"
                      d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Facebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialAuth('apple')}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-2 min-h-[48px] px-2 sm:px-3 py-3 border border-[var(--color-border)] hover:border-[var(--color-gold)] text-[var(--color-ink)] hover:text-[var(--color-gold)] text-[10px] tracking-[0.15em] uppercase font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Continue with Apple"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="shrink-0 sm:w-[14px] sm:h-[14px]"
                    aria-hidden="true"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span className="hidden sm:inline">Apple</span>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-[1px] bg-[var(--color-border-soft)]" />
                <span className="text-[9px] tracking-[0.4em] uppercase text-gray-400 font-semibold">
                  or continue with email
                </span>
                <div className="flex-1 h-[1px] bg-[var(--color-border-soft)]" />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-50 border border-red-100 px-4 py-3 tracking-wide mb-5">
                  {error}
                </p>
              )}
              {info && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 tracking-wide mb-5 flex items-center gap-2">
                  <i className="ri-checkbox-circle-line" />
                  {info}
                </p>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label htmlFor="register-name" className={labelCls}>
                      Full Name
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      required
                      minLength={2}
                      placeholder="Jane Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className={labelCls}>
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className={labelCls}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder={
                        mode === 'register' ? 'Min. 6 characters' : '••••••••'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputCls} pr-16`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tracking-widest uppercase text-gray-400 hover:text-[var(--color-gold)] transition-colors font-semibold"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label htmlFor="confirm-password" className={labelCls}>
                      Confirm Password
                    </label>
                    <input
                      id="confirm-password"
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot')
                        setError('')
                        setInfo('')
                      }}
                      className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[11px] tracking-[0.3em] uppercase font-bold py-4 transition-all duration-300 disabled:opacity-60 mt-2"
                >
                  {authLoading
                    ? 'Please wait…'
                    : mode === 'login'
                      ? 'Sign In'
                      : 'Create Account'}
                </button>
              </form>

              {mode === 'register' && (
                <p className="text-[10px] text-gray-400 text-center mt-5 tracking-wide leading-relaxed">
                  By creating an account, you agree to our{' '}
                  <Link
                    href="/policies/terms"
                    className="text-[var(--color-gold)] hover:underline"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/policies/privacy"
                    className="text-[var(--color-gold)] hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
