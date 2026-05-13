'use client'

import { useState } from 'react'

type Mode = 'subscribe' | 'unsubscribe'

export default function NewsletterPage() {
  const [mode, setMode]       = useState<Mode>('subscribe')
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const endpoint = mode === 'subscribe'
      ? '/api/newsletter/subscribe'
      : '/api/newsletter/unsubscribe'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await res.json()
      if (d.success) {
        setMessage(d.message)
        setEmail('')
      } else {
        setError(d.error || 'Something went wrong')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Newsletter</h1>
          <p className="text-sm text-gray-500 mb-6">
            Stay updated with new arrivals, exclusive offers, and perfume stories.
          </p>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 mb-6">
            {(['subscribe', 'unsubscribe'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setMessage(''); setError('') }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {m === 'subscribe' ? 'Subscribe' : 'Unsubscribe'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading
                ? 'Please wait…'
                : mode === 'subscribe'
                  ? 'Subscribe'
                  : 'Unsubscribe'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            We respect your privacy. No spam, ever.
          </p>
        </div>
      </div>
    </div>
  )
}
