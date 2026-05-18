'use client'

import { useCallback, useEffect, useState } from 'react'
import { smartFetch } from '@/lib/api'
import {
  normalizeNewsletterEmail,
  publishNewsletterStatus,
  readStoredNewsletterStatus,
  subscribeToNewsletterStatus,
} from '@/lib/newsletterStatus'

interface SettingsProfile {
  _id: string
  name?: string
  email?: string
  phone?: string
  hasPassword?: boolean
  createdAt?: string
}

interface Props {
  profile: SettingsProfile | null
  onProfileUpdate: (p: SettingsProfile) => void
}

const inputCls =
  'w-full border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-gold)] transition-colors'
const labelCls =
  'block text-[10px] tracking-widest uppercase font-semibold text-gray-400 mb-1.5'

export default function AccountSettings({ profile, onProfileUpdate }: Props) {
  const accountEmail = profile?.email ?? ''
  const profileName =
    profile?.name?.trim() ||
    (profile?.email ? profile.email.split('@')[0] : '')
  const [name, setName] = useState(profileName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [newsletterChecking, setNewsletterChecking] = useState(false)
  const [newsletterPending, setNewsletterPending] = useState(false)
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null)
  const [newsletterError, setNewsletterError] = useState<string | null>(null)

  const refreshNewsletterStatus = useCallback(async (email: string) => {
    const normalized = normalizeNewsletterEmail(email)
    if (!normalized) {
      setNewsletterOptIn(false)
      return
    }

    const stored = readStoredNewsletterStatus(normalized)
    if (stored !== null) setNewsletterOptIn(stored)

    setNewsletterChecking(true)
    setNewsletterError(null)
    try {
      const res = await smartFetch(
        `/api/newsletter/status?email=${encodeURIComponent(normalized)}`,
      )
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        const nextSubscribed = Boolean(data.subscribed)
        setNewsletterOptIn(nextSubscribed)
        publishNewsletterStatus(normalized, nextSubscribed)
      }
    } catch {
      if (stored === null) setNewsletterOptIn(false)
    } finally {
      setNewsletterChecking(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setName(profileName)
      setNewsletterMessage(null)
      setNewsletterError(null)
      void refreshNewsletterStatus(accountEmail)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [accountEmail, profileName, refreshNewsletterStatus])

  useEffect(() => {
    return subscribeToNewsletterStatus((detail) => {
      if (detail.email === normalizeNewsletterEmail(accountEmail)) {
        setNewsletterOptIn(detail.subscribed)
      }
    })
  }, [accountEmail])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await smartFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to update profile')
      } else {
        onProfileUpdate(data.user)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleNewsletterToggle(next: boolean) {
    const email = profile?.email?.trim()
    if (!email) {
      setNewsletterError('Your account email is required for newsletter updates')
      return
    }

    setNewsletterPending(true)
    setNewsletterError(null)
    setNewsletterMessage(null)

    try {
      const res = await smartFetch(
        next ? '/api/newsletter/subscribe' : '/api/newsletter/unsubscribe',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        },
      )
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        setNewsletterError(data?.error || 'Failed to update newsletter')
        return
      }

      setNewsletterOptIn(next)
      publishNewsletterStatus(email, next)
      setNewsletterMessage(next ? 'Newsletter subscribed' : 'Newsletter unsubscribed')
      setTimeout(() => setNewsletterMessage(null), 2500)
    } catch {
      setNewsletterError('Network error')
    } finally {
      setNewsletterPending(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-6">
          <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-5 tracking-wide">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="account-full-name" className={labelCls}>
                Full Name
              </label>
              <input
                id="account-full-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label htmlFor="account-email" className={labelCls}>
                Email Address
              </label>
              <input
                id="account-email"
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full border border-[var(--color-border-soft)] bg-[var(--color-cream-50)] px-3 py-2.5 text-sm text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6">
          <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-5 tracking-wide">
            Preferences
          </h3>
          <div className="space-y-4">
            {[
              {
                key: 'newsletter' as const,
                label: 'Newsletter',
                desc: 'Get the latest fragrance releases and exclusive offers',
                value: newsletterOptIn,
                disabled: newsletterChecking || newsletterPending || !profile?.email,
                onChange: (checked: boolean) => {
                  void handleNewsletterToggle(checked)
                },
              },
            ].map((pref) => (
              <label
                key={pref.key}
                className={`flex items-start gap-4 group ${
                  pref.disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                }`}
              >
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={pref.value}
                    disabled={pref.disabled}
                    onChange={(e) => pref.onChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                      pref.value ? 'bg-[var(--color-gold)]' : 'bg-gray-200'
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      pref.value ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">
                    {pref.label}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {pref.key === 'newsletter' && newsletterChecking
                      ? 'Checking newsletter preference...'
                      : pref.key === 'newsletter' && newsletterPending
                        ? 'Updating newsletter preference...'
                        : pref.desc}
                  </p>
                </div>
              </label>
            ))}
            {newsletterMessage && (
              <p className="text-xs text-emerald-600 font-semibold">
                {newsletterMessage}
              </p>
            )}
            {newsletterError && (
              <p className="text-xs text-red-500">
                {newsletterError}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-ink)] hover:bg-[var(--color-gold)] disabled:opacity-60 text-white text-[11px] tracking-[0.25em] uppercase font-bold px-10 py-3.5 transition-all duration-300 whitespace-nowrap"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold animate-pulse">
              <i className="ri-check-line" />
              Changes saved!
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs">
              <i className="ri-error-warning-line" />
              {error}
            </div>
          )}
        </div>
      </form>

      <ChangePasswordSection hasPassword={profile?.hasPassword} />
    </div>
  )
}

/* ─── Change Password Section ─── */
function ChangePasswordSection({ hasPassword }: { hasPassword?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSet = hasPassword === true

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (isSet && !currentPassword) {
      setError('Please enter your current password')
      return
    }

    setPending(true)
    try {
      const res = await smartFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: isSet ? currentPassword : undefined,
          newPassword,
          confirmPassword,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to update password')
      } else {
        setSuccess(
          data.message ?? (isSet ? 'Password changed' : 'Password set'),
        )
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setSuccess(null), 3500)
      }
    } catch {
      setError('Network error')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink)] tracking-wide">
          {isSet ? 'Change Password' : 'Set Password'}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mt-1">
          {isSet
            ? 'Update your account password. You will stay signed in on this device.'
            : 'You are signed in with a federated provider. Add a password to enable email login.'}
        </p>
      </div>

      {isSet && (
        <div>
          <label htmlFor="current-password" className={labelCls}>
            Current Password
          </label>
          <div className="relative">
            <input
              id="current-password"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${inputCls} pr-16`}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tracking-widest uppercase text-gray-400 hover:text-[var(--color-gold)] transition-colors font-semibold"
              tabIndex={-1}
              aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
            >
              {showCurrent ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="new-password" className={labelCls}>
          New Password
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Min. 6 characters"
            minLength={6}
            className={`${inputCls} pr-16`}
            required
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tracking-widest uppercase text-gray-400 hover:text-[var(--color-gold)] transition-colors font-semibold"
            tabIndex={-1}
            aria-label={showNew ? 'Hide new password' : 'Show new password'}
          >
            {showNew ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm-new-password" className={labelCls}>
          Confirm New Password
        </label>
        <input
          id="confirm-new-password"
          type={showNew ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Repeat new password"
          minLength={6}
          className={inputCls}
          required
        />
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-[var(--color-ink)] hover:bg-[var(--color-gold)] disabled:opacity-60 text-white text-[11px] tracking-[0.25em] uppercase font-bold px-10 py-3.5 transition-all duration-300 whitespace-nowrap"
        >
          {pending ? 'Saving…' : isSet ? 'Update Password' : 'Set Password'}
        </button>
        {success && (
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
            <i className="ri-check-line" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-xs">
            <i className="ri-error-warning-line" />
            {error}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 tracking-wide pt-1">
        Forgot your current password?{' '}
        <a
          href="/login"
          onClick={() =>
            typeof window !== 'undefined' &&
            sessionStorage.setItem('checkoutRedirect', '/account?tab=settings')
          }
          className="text-[var(--color-gold)] hover:underline font-semibold"
        >
          Use the &ldquo;forgot password&rdquo; flow
        </a>{' '}
        from the sign-in page.
      </p>
    </form>
  )
}
