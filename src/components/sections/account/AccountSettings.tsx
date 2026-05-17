'use client'

import { useState } from 'react'
import { smartFetch } from '@/lib/api'

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

export default function AccountSettings({ profile, onProfileUpdate }: Props) {
  const [name, setName] = useState(profile?.name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [newsletterOptIn, setNewsletterOptIn] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await smartFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name, phone }),
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

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <div className="bg-white p-6">
        <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-5 tracking-wide">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[10px] tracking-widest uppercase font-semibold text-gray-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-widest uppercase font-semibold text-gray-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="w-full border border-[var(--color-border-soft)] bg-[var(--color-cream-50)] px-3 py-2.5 text-sm text-gray-500"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-widest uppercase font-semibold text-gray-400 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
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
              key: 'notifications' as const,
              label: 'Order notifications',
              desc: 'Receive updates about your orders via email',
              value: notifications,
              setter: setNotifications,
            },
            {
              key: 'newsletter' as const,
              label: 'Newsletter',
              desc: 'Get the latest fragrance releases and exclusive offers',
              value: newsletterOptIn,
              setter: setNewsletterOptIn,
            },
          ].map((pref) => (
            <label
              key={pref.key}
              className="flex items-start gap-4 cursor-pointer group"
            >
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={pref.value}
                  onChange={(e) => pref.setter(e.target.checked)}
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
                <p className="text-[11px] text-gray-400 mt-0.5">{pref.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white p-6">
        <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-3 tracking-wide">
          Security
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          {profile?.hasPassword
            ? 'Your account has a password set. You can change it from the dedicated form.'
            : 'You are signed in with a federated provider. Add a password to enable email login.'}
        </p>
        <a
          href="/forgot-password"
          className="inline-block text-[10px] tracking-widest uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors"
        >
          {profile?.hasPassword ? 'Change password' : 'Reset / set password'} →
        </a>
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
  )
}
