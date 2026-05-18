'use client'

/**
 * Optimistic wishlist engine.
 *
 * Same shape as CartContext: per-product intent + debounced sync. Rapid clicks
 * collapse into a single final POST or DELETE; stale responses are discarded.
 * Guest users see an empty in-memory wishlist (server requires auth) and any
 * actions no-op gracefully.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { smartFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export interface WishlistProduct {
  _id: string
  name: string
  slug: string
  brand?: string
  minPrice?: number
  active?: boolean
  images?: Array<{ url: string; alt?: string }>
}

export interface WishlistItem {
  product: WishlistProduct
  addedAt?: string
}

interface WishlistResponseItem {
  productId: WishlistProduct | string
  addedAt?: string
}

interface ProductState {
  /** True if user wants this product in the wishlist. */
  target: boolean
  /** Last confirmed server state. */
  server: boolean
  intentId: number
  inflightId: number
  abortCtrl: AbortController | null
  timer: ReturnType<typeof setTimeout> | null
  /** Cached product meta so optimistic rows render before server returns. */
  product?: WishlistProduct
}

interface WishlistContextType {
  items: WishlistItem[]
  ids: Set<string>
  count: number
  loading: boolean
  isSyncing: boolean
  has: (productId: string) => boolean
  toggle: (productId: string, product?: WishlistProduct) => void
  add: (productId: string, product?: WishlistProduct) => void
  remove: (productId: string) => void
  refresh: () => Promise<void>
}

const DEBOUNCE_MS = 250

const WishlistContext = createContext<WishlistContextType | null>(null)

function normaliseItem(raw: WishlistResponseItem): WishlistItem | null {
  if (raw.productId && typeof raw.productId === 'object') {
    return { product: raw.productId, addedAt: raw.addedAt }
  }
  return null
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [server, setServer] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [bump, setBump] = useState(0)
  const states = useRef<Map<string, ProductState>>(new Map())

  const forceRerender = useCallback(() => setBump((b) => b + 1), [])

  const getOrCreate = useCallback((productId: string): ProductState => {
    let st = states.current.get(productId)
    if (!st) {
      st = {
        target: false,
        server: false,
        intentId: 0,
        inflightId: 0,
        abortCtrl: null,
        timer: null,
      }
      states.current.set(productId, st)
    }
    return st
  }, [])

  const applyServer = useCallback(
    (raw: WishlistResponseItem[]) => {
      const items: WishlistItem[] = []
      const serverIds = new Set<string>()
      for (const r of raw) {
        const it = normaliseItem(r)
        if (!it) continue
        items.push(it)
        serverIds.add(it.product._id)
        const st = getOrCreate(it.product._id)
        st.server = true
        st.product = it.product
        if (st.intentId === st.inflightId && !st.timer) {
          st.target = true
        }
      }
      for (const [pid, st] of states.current.entries()) {
        if (serverIds.has(pid)) continue
        st.server = false
        if (st.intentId === st.inflightId && !st.timer) {
          st.target = false
        }
      }
      setServer(items)
      forceRerender()
    },
    [forceRerender, getOrCreate],
  )

  const sendForProduct = useCallback(
    async (productId: string) => {
      if (!user) return
      const st = states.current.get(productId)
      if (!st) return
      if (st.intentId === st.inflightId) return
      if (st.abortCtrl) {
        st.abortCtrl.abort()
        st.abortCtrl = null
      }
      const intent = st.intentId
      const target = st.target
      const ctrl = new AbortController()
      st.abortCtrl = ctrl
      st.inflightId = intent
      forceRerender()

      try {
        let res: Response
        if (target) {
          res = await smartFetch('/api/wishlist', {
            method: 'POST',
            body: JSON.stringify({ productId }),
            signal: ctrl.signal,
          })
        } else {
          if (!st.server) {
            // Never persisted server-side; nothing to do.
            st.inflightId = st.intentId
            st.abortCtrl = null
            forceRerender()
            return
          }
          res = await smartFetch(
            `/api/wishlist/${encodeURIComponent(productId)}`,
            { method: 'DELETE', signal: ctrl.signal },
          )
        }

        const stale = st.intentId !== intent
        if (stale) {
          st.abortCtrl = null
          return
        }

        if (!res.ok) {
          // Roll back.
          st.target = st.server
          st.inflightId = st.intentId
          st.abortCtrl = null
          forceRerender()
          return
        }

        st.abortCtrl = null
        // Refresh the canonical list from the response if available,
        // otherwise mark this product as synced.
        const data = (await res.json().catch(() => null)) as {
          items?: WishlistResponseItem[]
        } | null
        if (data?.items) {
          applyServer(data.items)
        } else {
          st.server = target
          forceRerender()
        }

        const after = states.current.get(productId)
        if (after && after.intentId !== after.inflightId && !after.timer) {
          // Newer intent — fire again immediately.
          void sendForProduct(productId)
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        if (st.intentId === intent) {
          st.target = st.server
          st.inflightId = st.intentId
          st.abortCtrl = null
          forceRerender()
        }
      }
    },
    [applyServer, forceRerender, user],
  )

  const scheduleSend = useCallback(
    (productId: string, delay: number = DEBOUNCE_MS) => {
      const st = states.current.get(productId)
      if (!st) return
      if (st.timer) clearTimeout(st.timer)
      st.timer = setTimeout(() => {
        st.timer = null
        void sendForProduct(productId)
      }, delay)
    },
    [sendForProduct],
  )

  const bumpIntent = useCallback(
    (productId: string, target: boolean, product?: WishlistProduct) => {
      const st = getOrCreate(productId)
      st.target = target
      st.intentId += 1
      if (product) st.product = product
      if (st.abortCtrl) {
        st.abortCtrl.abort()
        st.abortCtrl = null
      }
      scheduleSend(productId)
      forceRerender()
    },
    [getOrCreate, scheduleSend, forceRerender],
  )

  const toggle = useCallback(
    (productId: string, product?: WishlistProduct) => {
      if (!user) {
        // Caller (UI) should redirect to /login; we still update local state
        // so the heart "fills" instantly until the redirect kicks in.
        const st = getOrCreate(productId)
        st.target = !st.target
        if (product) st.product = product
        forceRerender()
        return
      }
      const current = states.current.get(productId)
      bumpIntent(productId, !(current?.target ?? false), product)
    },
    [bumpIntent, forceRerender, getOrCreate, user],
  )

  const add = useCallback(
    (productId: string, product?: WishlistProduct) => {
      if (!user) return
      bumpIntent(productId, true, product)
    },
    [bumpIntent, user],
  )

  const remove = useCallback(
    (productId: string) => {
      if (!user) return
      bumpIntent(productId, false)
    },
    [bumpIntent, user],
  )

  const refresh = useCallback(async () => {
    if (!user) {
      setServer([])
      states.current.clear()
      setLoading(false)
      forceRerender()
      return
    }
    try {
      const res = await smartFetch('/api/wishlist')
      if (!res.ok) return
      const data = await res.json()
      if (data?.items) applyServer(data.items as WishlistResponseItem[])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [user, applyServer, forceRerender])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      // Logged out: clear server state but preserve any pending local toggles
      // since they would no-op anyway without auth.
      setServer([])
      setLoading(false)
      return
    }
    void refresh()
  }, [user, authLoading, refresh])

  useEffect(() => {
    const cur = states.current
    return () => {
      for (const st of cur.values()) {
        if (st.abortCtrl) st.abortCtrl.abort()
        if (st.timer) clearTimeout(st.timer)
      }
    }
  }, [])

  const optimisticItems = useMemo<WishlistItem[]>(() => {
    const map = new Map<string, WishlistItem>()
    for (const it of server) map.set(it.product._id, it)
    for (const [pid, st] of states.current.entries()) {
      if (st.target) {
        if (!map.has(pid) && st.product) {
          map.set(pid, { product: st.product })
        }
      } else {
        map.delete(pid)
      }
    }
    return Array.from(map.values())
  }, [server, bump])

  const ids = useMemo(
    () => new Set(optimisticItems.map((it) => it.product._id)),
    [optimisticItems],
  )

  const isSyncing = useMemo(() => {
    for (const st of states.current.values()) {
      if (st.timer || st.abortCtrl || st.intentId !== st.inflightId) return true
    }
    return false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump])

  const value = useMemo<WishlistContextType>(
    () => ({
      items: optimisticItems,
      ids,
      count: optimisticItems.length,
      loading,
      isSyncing,
      has: (productId: string) => {
        const st = states.current.get(productId)
        if (st) return st.target
        return ids.has(productId)
      },
      toggle,
      add,
      remove,
      refresh,
    }),
    [optimisticItems, ids, loading, isSyncing, toggle, add, remove, refresh],
  )

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx)
    throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
