'use client'

import { auth } from '@/lib/firebase'
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
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
  } catch {}
  localStorage.removeItem('cartSessionId')
}

function getRedirectDest() {
  const dest = sessionStorage.getItem('checkoutRedirect') ?? '/'
  sessionStorage.removeItem('checkoutRedirect')
  return dest
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [mode, setMode]                     = useState<AuthMode>('login')
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName]                     = useState('')
  const [showPass, setShowPass]             = useState(false)
  const [error, setError]                   = useState('')
  const [info, setInfo]                     = useState('')
  const [authLoading, setAuthLoading]       = useState(false)
  const [mounted, setMounted]               = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
      } catch {}
    })()
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    if (!loading && user) router.push(getRedirectDest())
  }, [user, loading, router])

  const afterAuth = async (token: string) => {
    await syncUserToDB(token)
    await mergeGuestCart(token)
    router.push(getRedirectDest())
  }

  const handleSocialAuth = async (providerName: 'google' | 'facebook' | 'apple') => {
    setAuthLoading(true)
    setError('')
    let provider: GoogleAuthProvider | FacebookAuthProvider | OAuthProvider
    if (providerName === 'google') provider = new GoogleAuthProvider()
    else if (providerName === 'facebook') provider = new FacebookAuthProvider()
    else { provider = new OAuthProvider('apple.com'); (provider as OAuthProvider).addScope('email') }

    try {
      const result = await signInWithPopup(auth, provider)
      await afterAuth(await result.user.getIdToken())
    } catch (err: any) {
      const code = err?.code as string | undefined
      if (code && POPUP_FALLBACK_CODES.has(code)) {
        try { await signInWithRedirect(auth, provider); return } catch {}
      }
      setError(code === 'auth/account-exists-with-different-credential'
        ? 'An account already exists with this email.'
        : `${providerName.charAt(0).toUpperCase() + providerName.slice(1)} sign in failed.`)
    } finally { setAuthLoading(false) }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    setInfo('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match'); setAuthLoading(false); return
    }

    try {
      const result = mode === 'register'
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password)
      await afterAuth(await result.user.getIdToken())
    } catch (err: any) {
      const code = err?.code as string | undefined
      const msgs: Record<string, string> = {
        'auth/wrong-password':    'Incorrect password.',
        'auth/user-not-found':    'No account found with this email.',
        'auth/email-already-in-use': 'Email already in use.',
        'auth/weak-password':     'Password must be at least 6 characters.',
        'auth/invalid-email':     'Invalid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      }
      setError(msgs[code ?? ''] ?? 'Authentication failed. Please try again.')
    } finally { setAuthLoading(false) }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    setInfo('')
    try {
      await sendPasswordResetEmail(auth, email)
      setInfo('Reset link sent! Check your email.')
    } catch (err: any) {
      const code = err?.code as string | undefined
      setError(code === 'auth/user-not-found' ? 'No account found with this email.' : 'Failed to send reset email.')
    } finally { setAuthLoading(false) }
  }

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #333', borderTopColor: '#c9a96e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap');

        * { box-sizing: border-box; }

        .login-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #0a0a0a;
          font-family: 'Jost', sans-serif;
        }
        @media (max-width: 768px) {
          .login-root { grid-template-columns: 1fr; }
          .login-visual { display: none !important; }
        }

        .login-visual {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 48px;
        }
        .login-visual-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 30% 40%, rgba(201,169,110,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 70% 70%, rgba(139,90,60,0.14) 0%, transparent 55%),
            linear-gradient(160deg, #1a1208 0%, #0e0b06 40%, #080808 100%);
        }
        .login-visual-lines {
          position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(90deg, rgba(201,169,110,0.04) 0px, rgba(201,169,110,0.04) 1px, transparent 1px, transparent 80px),
            repeating-linear-gradient(0deg, rgba(201,169,110,0.04) 0px, rgba(201,169,110,0.04) 1px, transparent 1px, transparent 80px);
        }
        .login-visual-orb {
          position: absolute;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 70%);
          top: 20%; left: 20%;
          animation: drift 8s ease-in-out infinite alternate;
        }
        .login-visual-orb2 {
          position: absolute;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139,90,60,0.2) 0%, transparent 70%);
          bottom: 30%; right: 15%;
          animation: drift2 10s ease-in-out infinite alternate;
        }
        @keyframes drift { from { transform: translate(0,0) } to { transform: translate(30px, -20px) } }
        @keyframes drift2 { from { transform: translate(0,0) } to { transform: translate(-20px, 15px) } }

        .login-visual-icon {
          position: absolute;
          top: 48px; left: 48px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 300;
          letter-spacing: 0.2em;
          color: #c9a96e;
          text-transform: uppercase;
        }

        .login-visual-text {
          position: relative;
          z-index: 1;
        }
        .login-visual-text h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 52px;
          font-weight: 300;
          line-height: 1.1;
          color: #f5ead8;
          margin: 0 0 16px;
          letter-spacing: -0.01em;
        }
        .login-visual-text h2 em {
          font-style: italic;
          color: #c9a96e;
        }
        .login-visual-text p {
          font-size: 13px;
          font-weight: 300;
          color: rgba(245,234,216,0.45);
          letter-spacing: 0.08em;
          margin: 0;
          line-height: 1.6;
        }
        .login-visual-divider {
          width: 40px; height: 1px;
          background: #c9a96e;
          margin-bottom: 20px;
          opacity: 0.6;
        }

        .login-form-side {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          background: #0f0f0f;
        }
        .login-form-box {
          width: 100%;
          max-width: 400px;
        }

        .login-logo-mobile {
          display: none;
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 300;
          letter-spacing: 0.2em;
          color: #c9a96e;
          text-transform: uppercase;
          margin-bottom: 32px;
        }
        @media (max-width: 768px) { .login-logo-mobile { display: block; } }

        .login-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          color: #f5ead8;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
        }
        .login-subtitle {
          font-size: 13px;
          font-weight: 300;
          color: rgba(245,234,216,0.4);
          letter-spacing: 0.04em;
          margin: 0 0 32px;
        }
        .login-subtitle a, .login-subtitle button {
          color: #c9a96e;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-size: inherit;
          font-family: inherit;
          font-weight: 400;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .social-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 24px;
        }
        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 12px;
          background: transparent;
          border: 1px solid rgba(201,169,110,0.2);
          border-radius: 8px;
          color: rgba(245,234,216,0.75);
          font-family: 'Jost', sans-serif;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .social-btn:hover:not(:disabled) {
          border-color: #c9a96e;
          color: #c9a96e;
          background: rgba(201,169,110,0.05);
        }
        .social-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(201,169,110,0.15);
        }
        .divider span {
          font-size: 11px;
          letter-spacing: 0.12em;
          color: rgba(245,234,216,0.25);
          text-transform: uppercase;
        }

        .field {
          margin-bottom: 16px;
          position: relative;
        }
        .field label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(245,234,216,0.4);
          margin-bottom: 8px;
          font-weight: 400;
        }
        .field input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(201,169,110,0.15);
          border-radius: 8px;
          color: #f5ead8;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 300;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          -webkit-appearance: none;
        }
        .field input::placeholder { color: rgba(245,234,216,0.2); }
        .field input:focus {
          border-color: rgba(201,169,110,0.5);
          background: rgba(201,169,110,0.04);
        }
        .field input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #161410 inset;
          -webkit-text-fill-color: #f5ead8;
        }
        .field-pass-toggle {
          position: absolute;
          right: 14px;
          bottom: 13px;
          background: none;
          border: none;
          color: rgba(245,234,216,0.3);
          cursor: pointer;
          font-size: 12px;
          letter-spacing: 0.06em;
          padding: 0;
          transition: color 0.2s;
          font-family: 'Jost', sans-serif;
        }
        .field-pass-toggle:hover { color: #c9a96e; }

        .forgot-link {
          display: block;
          text-align: right;
          font-size: 11px;
          letter-spacing: 0.06em;
          color: rgba(201,169,110,0.6);
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Jost', sans-serif;
          margin-top: -8px;
          margin-bottom: 20px;
          padding: 0;
          transition: color 0.2s;
          text-align: right;
        }
        .forgot-link:hover { color: #c9a96e; }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #c9a96e 0%, #a07840 100%);
          border: none;
          border-radius: 8px;
          color: #0a0a0a;
          font-family: 'Jost', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          margin-bottom: 0;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .error-box {
          background: rgba(220,38,38,0.08);
          border: 1px solid rgba(220,38,38,0.2);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #fca5a5;
          font-weight: 300;
        }
        .info-box {
          background: rgba(201,169,110,0.08);
          border: 1px solid rgba(201,169,110,0.2);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #c9a96e;
          font-weight: 300;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: rgba(245,234,216,0.3);
          font-family: 'Jost', sans-serif;
          font-size: 12px;
          letter-spacing: 0.06em;
          cursor: pointer;
          padding: 0;
          margin-bottom: 28px;
          transition: color 0.2s;
        }
        .back-link:hover { color: #c9a96e; }

        .terms {
          margin-top: 20px;
          font-size: 11px;
          color: rgba(245,234,216,0.2);
          text-align: center;
          letter-spacing: 0.03em;
          line-height: 1.5;
        }
        .terms a { color: rgba(201,169,110,0.5); text-decoration: none; }
        .terms a:hover { color: #c9a96e; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fadeUp 0.4s ease both;
        }
      `}</style>

      <div className="login-root">
        {/* ── Visual Panel ── */}
        <div className="login-visual">
          <div className="login-visual-bg" />
          <div className="login-visual-lines" />
          <div className="login-visual-orb" />
          <div className="login-visual-orb2" />
          <div className="login-visual-icon">Scentara</div>
          <div className="login-visual-text">
            <div className="login-visual-divider" />
            <h2>The art of<br /><em>rare fragrance</em></h2>
            <p>Curated from the world's finest<br />ateliers. Delivered to you.</p>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="login-form-side">
          <div className="login-form-box fade-up">
            <div className="login-logo-mobile">Scentara</div>

            {/* ── FORGOT PASSWORD ── */}
            {mode === 'forgot' && (
              <>
                <button className="back-link" onClick={() => { setMode('login'); setError(''); setInfo('') }}>
                  ← Back to sign in
                </button>
                <h1 className="login-title">Reset password</h1>
                <p className="login-subtitle">We'll send a reset link to your email.</p>

                {error && <div className="error-box">{error}</div>}
                {info  && <div className="info-box">{info}</div>}

                <form onSubmit={handleForgot}>
                  <div className="field">
                    <label>Email address</label>
                    <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <button type="submit" className="submit-btn" disabled={authLoading}>
                    {authLoading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}

            {/* ── LOGIN / REGISTER ── */}
            {mode !== 'forgot' && (
              <>
                <h1 className="login-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
                <p className="login-subtitle">
                  {mode === 'login' ? "New here? " : 'Already have an account? '}
                  <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo('') }}>
                    {mode === 'login' ? 'Create account' : 'Sign in'}
                  </button>
                </p>

                {/* Social auth */}
                <div className="social-row">
                  <button className="social-btn" onClick={() => handleSocialAuth('google')} disabled={authLoading}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </button>
                  <button className="social-btn" onClick={() => handleSocialAuth('facebook')} disabled={authLoading}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>
                  <button className="social-btn" onClick={() => handleSocialAuth('apple')} disabled={authLoading}>
                    <svg width="14" height="15" viewBox="0 0 814 1000" fill="currentColor">
                      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 395.7 0 320 0 248.1C0 109.5 79.5 36 156.7 36c78.8 0 127.9 52 166.3 52 36.8 0 94.7-55.2 180.7-55.2 28.5 0 130.9 2.6 198.3 99.2zM554.1 27.4c33.1-39.9 56.9-95.7 56.9-151.6 0-8.1-.6-16.3-2-23.4-53.9 2-117.4 35.8-155.8 80.7-30.5 34.9-56.9 90.8-56.9 147.4 0 9 1.3 18 2 20.7 3.2.6 8.4 1.3 13.6 1.3 48.7 0 109.3-32.4 142.2-75.1z"/>
                    </svg>
                    Apple
                  </button>
                </div>

                <div className="divider"><span>or continue with email</span></div>

                {error && <div className="error-box">{error}</div>}
                {info  && <div className="info-box">{info}</div>}

                <form onSubmit={handleEmailAuth}>
                  {mode === 'register' && (
                    <div className="field">
                      <label>Full name</label>
                      <input type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                  )}

                  <div className="field">
                    <label>Email address</label>
                    <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  <div className="field">
                    <label>Password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ paddingRight: 60 }}
                    />
                    <button type="button" className="field-pass-toggle" onClick={() => setShowPass(p => !p)}>
                      {showPass ? 'hide' : 'show'}
                    </button>
                  </div>

                  {mode === 'register' && (
                    <div className="field">
                      <label>Confirm password</label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  )}

                  {mode === 'login' && (
                    <button type="button" className="forgot-link" onClick={() => { setMode('forgot'); setError(''); setInfo('') }}>
                      Forgot password?
                    </button>
                  )}

                  <button type="submit" className="submit-btn" disabled={authLoading}>
                    {authLoading
                      ? 'Please wait…'
                      : mode === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                </form>

                {mode === 'register' && (
                  <p className="terms">
                    By creating an account, you agree to our{' '}
                    <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
