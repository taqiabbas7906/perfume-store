'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/api'
import { clearStoreSettingsCache } from '@/lib/useStoreSettings'

interface SettingsResponse {
  success?: boolean
  settings?: {
    homepage?: { tagline?: string }
  }
  error?: string
}

const PLACEHOLDER = 'Always Fast & Free Shipping — No Minimum Order'

/**
 * Admin card — controls the announcement bar that sits above the navbar
 * on the storefront. Leaving the tagline blank falls back to a
 * free-delivery message when the store has global free delivery on,
 * otherwise the bar is hidden.
 */
export default function HomepageSettingsCard() {
  const [tagline, setTagline] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/settings')
      const data = (await res.json()) as SettingsResponse
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load settings')
      }
      setTagline(data.settings?.homepage?.tagline ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  async function save() {
    setSaving(true)
    setError('')
    setSavedFlash(false)
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ homepage: { tagline: tagline.trim() } }),
      })
      const data = (await res.json()) as SettingsResponse
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save settings')
      }
      // Invalidate the storefront's in-process settings cache so the new
      // tagline is picked up on the next mount instead of waiting out the
      // 60s TTL.
      clearStoreSettingsCache()
      setTagline(data.settings?.homepage?.tagline ?? tagline.trim())
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-paper-200 p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-charcoal-900">
            Homepage Message
          </h3>
          <p className="text-xs text-charcoal-500 mt-1">
            Announcement bar above the navbar. Leave blank to fall back to the
            free-delivery message (or hide the bar when none applies).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-charcoal-500 py-4">
          <i className="ri-loader-4-line animate-spin" />
          Loading settings…
        </div>
      ) : (
        <>
          <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
            Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={240}
            placeholder={PLACEHOLDER}
            className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-charcoal-400">
              {tagline.trim().length === 0
                ? 'Empty → auto-fall back to free-delivery message when enabled.'
                : `${tagline.length}/240 characters`}
            </p>
            {tagline.length >= 220 && (
              <p className="text-xs text-amber-600">
                {240 - tagline.length} characters left
              </p>
            )}
          </div>

          {/* Live preview */}
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-charcoal-400 mb-1.5">
              Preview
            </p>
            <div className="rounded border border-paper-200 overflow-hidden">
              <div className="bg-[var(--color-cream-400)] text-[var(--color-gold-deep)] text-center text-[11px] sm:text-xs px-4 sm:px-6 py-2 tracking-widest uppercase font-semibold">
                {tagline.trim() || PLACEHOLDER}
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 mt-4">
            {savedFlash && (
              <span className="text-xs text-green-700 flex items-center gap-1">
                <i className="ri-check-line" /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Tagline'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
