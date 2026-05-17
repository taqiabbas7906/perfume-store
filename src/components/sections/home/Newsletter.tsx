'use client'

import { useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function Newsletter() {
  const [status, setStatus] = useState<Status>('idle')
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setStatus('success')
        setEmail('')
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

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 flex items-center justify-center border border-[var(--color-gold)] bg-[var(--color-cream-300)]">
              <i className="ri-check-line text-[var(--color-gold)] text-2xl" />
            </div>
            <p className="text-[var(--color-ink)] font-light text-sm tracking-wide">
              You&apos;re on the list! Watch your inbox.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-0 max-w-lg mx-auto"
          >
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 bg-white border border-[var(--color-border)] sm:border-r-0 text-[var(--color-ink)] placeholder-gray-400 px-5 py-4 text-sm focus:outline-none focus:border-[var(--color-gold)] transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white text-xs tracking-widest uppercase font-bold px-8 py-4 transition-colors whitespace-nowrap disabled:opacity-60 border border-[var(--color-gold)]"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
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
