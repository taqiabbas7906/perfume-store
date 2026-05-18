'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  normalizeNewsletterEmail,
  publishNewsletterStatus,
  readStoredNewsletterStatus,
  subscribeToNewsletterStatus,
} from '@/lib/newsletterStatus'

type Status = 'idle' | 'loading' | 'error'

export default function Newsletter() {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<Status>('idle')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const accountEmail = user?.email ?? ''

  const refreshSubscription = useCallback(async (targetEmail: string) => {
    const normalized = normalizeNewsletterEmail(targetEmail)
    if (!normalized) {
      setSubscribed(false)
      return
    }

    const stored = readStoredNewsletterStatus(normalized)
    if (stored !== null) setSubscribed(stored)

    setChecking(true)
    try {
      const res = await fetch(
        `/api/newsletter/status?email=${encodeURIComponent(normalized)}`,
      )
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        const nextSubscribed = Boolean(data.subscribed)
        setSubscribed(nextSubscribed)
        publishNewsletterStatus(normalized, nextSubscribed)
      }
    } catch {
      /* leave local state as-is */
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    const timer = window.setTimeout(() => {
      if (accountEmail) {
        setEmail(accountEmail)
        void refreshSubscription(accountEmail)
      } else {
        setSubscribed(false)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [accountEmail, authLoading, refreshSubscription])

  useEffect(() => {
    return subscribeToNewsletterStatus((detail) => {
      const activeEmail = normalizeNewsletterEmail(accountEmail || email)
      if (detail.email === activeEmail) setSubscribed(detail.subscribed)
    })
  }, [accountEmail, email])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const targetEmail = normalizeNewsletterEmail(accountEmail || email)
    if (!targetEmail) return
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setStatus('idle')
        setSubscribed(true)
        setEmail(targetEmail)
        publishNewsletterStatus(targetEmail, true)
      } else {
        setStatus('error')
        setErrorMessage(data?.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Network error')
    }
  }

  const handleUnsubscribe = async () => {
    const targetEmail = normalizeNewsletterEmail(accountEmail || email)
    if (!targetEmail) return
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setStatus('idle')
        setSubscribed(false)
        setEmail(targetEmail)
        publishNewsletterStatus(targetEmail, false)
      } else {
        setStatus('error')
        setErrorMessage(data?.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Network error')
    }
  }

  return (
    <section className="relative py-24 px-6 overflow-hidden bg-[var(--color-cream-200)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[var(--color-cream-400)] opacity-60" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[var(--color-cream-400)] opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-[var(--color-border)]/50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-[var(--color-border)]/40" />
      </div>

      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />

      <div className="relative max-w-2xl mx-auto text-center">
        <div className="w-14 h-14 flex items-center justify-center border border-[var(--color-gold-soft)] mx-auto mb-6 bg-white">
          <i className="ri-mail-open-line text-[var(--color-gold)] text-xl" />
        </div>

        <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-xs font-semibold mb-3">
          Stay Updated
        </p>
        <h2 className="font-serif text-4xl font-light text-[var(--color-ink)] mb-3">
          Sign Up For <strong className="font-bold">Exclusive Deals</strong>
        </h2>
        <p className="text-gray-500 text-sm mb-10 tracking-wide font-light">
          Be the first to know about exclusive offers, new arrivals, and fragrance drops.
        </p>

        {subscribed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 flex items-center justify-center border border-[var(--color-gold)] bg-[var(--color-cream-300)]">
              <i className="ri-check-line text-[var(--color-gold)] text-2xl" />
            </div>
            <p className="text-[var(--color-ink)] font-light text-sm tracking-wide">
              Already subscribed with {accountEmail || email}.
            </p>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={status === 'loading'}
              className="text-[11px] tracking-widest uppercase font-bold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-60"
            >
              {status === 'loading' ? 'Unsubscribing...' : 'Want to unsubscribe?'}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-0 max-w-lg mx-auto"
          >
            <label htmlFor="home-newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="home-newsletter-email"
              type="email"
              name="email"
              value={accountEmail || email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={Boolean(accountEmail) || status === 'loading'}
              required
              className="flex-1 bg-white border border-[var(--color-border)] sm:border-r-0 text-[var(--color-ink)] placeholder-gray-400 px-5 py-4 text-sm focus:outline-none focus:border-[var(--color-gold)] transition-colors disabled:bg-[var(--color-cream-50)] disabled:text-gray-500"
            />
            <button
              type="submit"
              disabled={status === 'loading' || checking}
              className="bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white text-xs tracking-widest uppercase font-bold px-8 py-4 transition-colors whitespace-nowrap disabled:opacity-60 border border-[var(--color-gold)]"
            >
              {status === 'loading'
                ? 'Subscribing...'
                : checking
                  ? 'Checking...'
                  : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-red-500 text-xs mt-3 tracking-wide">
            {errorMessage || 'Something went wrong. Please try again.'}
          </p>
        )}

        <p className="text-gray-400 text-xs mt-6 tracking-wider font-light">
          No spam. Unsubscribe at any time.
        </p>
      </div>
    </section>
  )
}
