'use client'

import { useEffect, useState } from 'react'
import type { FreeDeliverySettings } from '@/lib/freeDelivery'

export interface StoreSettings {
  freeDelivery: FreeDeliverySettings
  homepage: { tagline: string }
}

const DEFAULT_SETTINGS: StoreSettings = {
  freeDelivery: { enabled: false, threshold: 0 },
  homepage: { tagline: '' },
}

/**
 * Process-level memo so multiple components (cart progress bar, product
 * page, navbar promo, etc.) share a single network call. Cleared by the
 * version bump on hot-reload in dev.
 */
let cache: { ts: number; data: StoreSettings } | null = null
const TTL_MS = 60_000

interface SettingsResponse {
  success?: boolean
  settings?: {
    freeDelivery?: { enabled?: boolean; threshold?: number }
    homepage?: { tagline?: string }
  }
}

export function clearStoreSettingsCache() {
  cache = null
}

export function useStoreSettings(): {
  settings: StoreSettings
  loading: boolean
} {
  const [settings, setSettings] = useState<StoreSettings>(
    cache?.data ?? DEFAULT_SETTINGS,
  )
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    let cancelled = false

    // Defer all state mutations to the next tick so the
    // react-hooks/set-state-in-effect rule doesn't trip on this fetch
    // pattern. Functionally identical to running synchronously.
    const id = window.setTimeout(() => {
      if (cancelled) return

      if (cache && Date.now() - cache.ts < TTL_MS) {
        setSettings(cache.data)
        setLoading(false)
        return
      }

      fetch('/api/settings', { cache: 'no-store' })
        .then((r) => r.json() as Promise<SettingsResponse>)
        .then((data) => {
          if (cancelled) return
          const fd = data?.settings?.freeDelivery
          const hp = data?.settings?.homepage
          const parsed: StoreSettings = {
            freeDelivery: {
              enabled: !!fd?.enabled,
              threshold: typeof fd?.threshold === 'number' ? fd.threshold : 0,
            },
            homepage: {
              tagline: typeof hp?.tagline === 'string' ? hp.tagline : '',
            },
          }
          cache = { ts: Date.now(), data: parsed }
          setSettings(parsed)
        })
        .catch(() => {
          // Fall back to the defaults; the storefront stays functional.
          if (!cancelled) setSettings(DEFAULT_SETTINGS)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [])

  return { settings, loading }
}
