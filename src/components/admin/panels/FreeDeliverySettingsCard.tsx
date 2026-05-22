'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/api'
import { clearStoreSettingsCache } from '@/lib/useStoreSettings'

interface SettingsResponse {
  success?: boolean
  settings?: {
    freeDelivery?: { enabled: boolean; threshold: number }
  }
  error?: string
}

/**
 * Admin Dashboard card — controls the global Free Delivery configuration.
 * The setting is a singleton doc; this card both reads and writes it via
 * `/api/admin/settings`.
 */
export default function FreeDeliverySettingsCard() {
  const [enabled, setEnabled] = useState(false)
  const [threshold, setThreshold] = useState('')
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
      const fd = data.settings?.freeDelivery
      setEnabled(!!fd?.enabled)
      setThreshold(fd?.threshold ? String(fd.threshold) : '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Defer the first fetch so eslint's react-hooks/set-state-in-effect
    // rule doesn't trip — the effect body shouldn't trigger a setState
    // synchronously.
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
      const parsedThreshold = threshold.trim() ? parseFloat(threshold) : 0
      if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
        throw new Error('Threshold must be a non-negative number.')
      }
      const res = await authFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          freeDelivery: { enabled, threshold: parsedThreshold },
        }),
      })
      const data = (await res.json()) as SettingsResponse
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save settings')
      }
      clearStoreSettingsCache()
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const numericThreshold = parseFloat(threshold) || 0
  const mode: 'off' | 'all' | 'threshold' = !enabled
    ? 'off'
    : numericThreshold > 0
      ? 'threshold'
      : 'all'

  const description =
    mode === 'off'
      ? 'Standard shipping rates apply to every product unless the product itself has free delivery enabled.'
      : mode === 'all'
        ? 'Every order ships free, no minimum required. Customers see a "Free Delivery" badge on every product.'
        : `Orders of $${numericThreshold.toFixed(2)} or more ship free. Smaller orders use standard rates, with a progress bar nudging customers toward the threshold.`

  return (
    <div className="bg-white rounded-lg border border-paper-200 p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-charcoal-900">Free Delivery</h3>
          <p className="text-xs text-charcoal-500 mt-1">
            Store-wide shipping rule. Per-product overrides still apply on top.
          </p>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-medium ${
            mode === 'off'
              ? 'bg-gray-100 text-gray-500'
              : mode === 'all'
                ? 'bg-green-50 text-green-700'
                : 'bg-gold-50 text-gold-700'
          }`}
        >
          {mode === 'off' ? 'Off' : mode === 'all' ? 'All Orders' : 'Threshold'}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-charcoal-500 py-4">
          <i className="ri-loader-4-line animate-spin" />
          Loading settings…
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer py-1">
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400/30 ${
                  enabled ? 'bg-gold-500' : 'bg-paper-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-4' : ''
                  }`}
                />
              </button>
              <span className="text-sm text-charcoal-700">
                Offer free delivery store-wide
              </span>
            </label>

            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                Minimum order amount{' '}
                <span className="text-charcoal-400 font-normal">
                  (leave blank for all orders)
                </span>
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-charcoal-400">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  disabled={!enabled}
                  placeholder="0.00"
                  className="w-full bg-paper-50 border border-paper-300 pl-7 pr-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-charcoal-500 leading-relaxed mt-4">{description}</p>

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
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
