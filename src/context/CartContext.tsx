'use client'

/**
 * Optimistic cart engine.
 *
 * Principles:
 * - User intent is captured instantly into a per-SKU "target quantity".
 * - All UI derives from optimistic state, never blocks on the network.
 * - Backend sync is debounced per SKU; rapid clicks merge into one request.
 * - Each user click bumps a monotonic `intentId`; responses older than the
 *   current `intentId` are discarded so stale data can't overwrite newer state.
 * - On network failure, we roll back only if no newer intent has been queued.
 * - On checkout, `flush()` waits for all pending mutations to settle before
 *   letting the order/payment flow proceed (backend remains source of truth).
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
import { clearGuestSessionId, peekGuestSessionId, smartFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export interface CartItem {
  productId: string
  variantSku: string
  quantity: number
  price: number
  name: string
  variantLabel: string
  image: string
  slug?: string
  brand?: string
  /** Whether the product itself qualifies for free delivery. */
  freeDelivery?: boolean
  addedAt?: string
}

export interface CartVoucher {
  code: string
  discount: number
  type: string
}

interface CartSummary {
  items: CartItem[]
  subtotal: number
  total: number
  itemCount: number
  discount: number
  vouchers: CartVoucher[]
}

interface AddItemArgs {
  productId: string
  variantSku: string
  quantity?: number
  /** Optional snapshot of display fields so the optimistic row can render
   *  before the server response arrives. */
  meta?: Partial<
    Pick<CartItem, 'name' | 'price' | 'image' | 'variantLabel' | 'slug' | 'brand'>
  >
}

interface SkuState {
  /** What the user wants right now. */
  targetQty: number
  /** Last confirmed server quantity. */
  serverQty: number
  /** True once any successful server response has confirmed the SKU exists. */
  existsOnServer: boolean
  /** Monotonic counter — bumped each time the user changes targetQty. */
  intentId: number
  /** intentId that is currently being sent (0 = idle). */
  inflightId: number
  abortCtrl: AbortController | null
  timer: ReturnType<typeof setTimeout> | null
  /** Cached display fields for optimistic rendering. */
  meta: Partial<CartItem>
}

interface CartContextType extends CartSummary {
  loading: boolean
  isOpen: boolean
  /** True while any per-SKU mutation is pending (timer queued or in flight). */
  isSyncing: boolean
  error: string | null
  totalItems: number
  totalPrice: number
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  /** Optimistic. Returns immediately. */
  addItem: (args: AddItemArgs) => Promise<{ ok: boolean; error?: string }>
  updateQty: (sku: string, qty: number) => void
  removeItem: (sku: string) => void
  clearCart: () => Promise<void>
  applyVoucher: (code: string) => Promise<{ ok: boolean; error?: string }>
  removeVoucher: (code: string) => Promise<void>
  refresh: () => Promise<void>
  /** Force every pending mutation to settle. Resolves with the final server
   *  cart so checkout sees the canonical state. */
  flush: () => Promise<void>
}

const EMPTY: CartSummary = {
  items: [],
  subtotal: 0,
  total: 0,
  itemCount: 0,
  discount: 0,
  vouchers: [],
}
const DEBOUNCE_MS = 250

const CartContext = createContext<CartContextType | null>(null)

interface ServerCartResponse {
  items?: CartItem[]
  subtotal?: number
  total?: number
  itemCount?: number
  discount?: number
  vouchers?: CartVoucher[]
  success?: boolean
  error?: string
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [serverCart, setServerCart] = useState<CartSummary>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  /** Bump counter — every per-SKU mutation triggers a render via this. */
  const [bump, setBump] = useState(0)
  const skuStates = useRef<Map<string, SkuState>>(new Map())
  const pendingResolves = useRef<Array<() => void>>([])
  const mergedRef = useRef(false)

  const forceRerender = useCallback(() => setBump((b) => b + 1), [])

  const getOrCreate = useCallback((sku: string): SkuState => {
    let st = skuStates.current.get(sku)
    if (!st) {
      st = {
        targetQty: 0,
        serverQty: 0,
        existsOnServer: false,
        intentId: 0,
        inflightId: 0,
        abortCtrl: null,
        timer: null,
        meta: {},
      }
      skuStates.current.set(sku, st)
    }
    return st
  }, [])

  const anyPending = useCallback(() => {
    for (const st of skuStates.current.values()) {
      if (st.timer || st.abortCtrl || st.intentId !== st.inflightId) return true
    }
    return false
  }, [])

  const drainPendingResolves = useCallback(() => {
    if (anyPending()) return
    const resolvers = pendingResolves.current.splice(0)
    for (const r of resolvers) r()
  }, [anyPending])

  /** Merge a server cart response into local state.
   *  - Always trusts server for vouchers, totals, prices, meta.
   *  - Per-SKU targetQty only aligned with server when that SKU is idle
   *    (no newer user intent pending).
   */
  const applyServerCart = useCallback(
    (data: ServerCartResponse) => {
      const next: CartSummary = {
        items: data.items ?? [],
        subtotal: data.subtotal ?? 0,
        total: data.total ?? 0,
        itemCount: data.itemCount ?? 0,
        discount: data.discount ?? 0,
        vouchers: data.vouchers ?? [],
      }
      setServerCart(next)

      const serverSkus = new Set<string>()
      for (const item of next.items) {
        serverSkus.add(item.variantSku)
        const st = getOrCreate(item.variantSku)
        st.serverQty = item.quantity
        st.existsOnServer = true
        st.meta = {
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          variantLabel: item.variantLabel,
          slug: item.slug,
          brand: item.brand,
        }
        // Sync target only when idle (no pending user intent for this SKU).
        if (st.intentId === st.inflightId && !st.timer) {
          st.targetQty = item.quantity
        }
      }
      // Handle SKUs that exist locally but not in the response.
      for (const [sku, st] of skuStates.current.entries()) {
        if (serverSkus.has(sku)) continue
        st.serverQty = 0
        st.existsOnServer = false
        if (st.intentId === st.inflightId && !st.timer) {
          st.targetQty = 0
        }
      }
      forceRerender()
    },
    [forceRerender, getOrCreate],
  )

  // Forward declaration so sendForSku can re-schedule itself.
  const scheduleSendRef = useRef<(sku: string, delay?: number) => void>(
    () => {},
  )

  const sendForSku = useCallback(
    async (sku: string) => {
      const st = skuStates.current.get(sku)
      if (!st) return
      if (st.intentId === st.inflightId) {
        drainPendingResolves()
        return
      }
      if (st.abortCtrl) {
        st.abortCtrl.abort()
        st.abortCtrl = null
      }

      const intent = st.intentId
      const target = st.targetQty
      const wasExists = st.existsOnServer
      const productId = st.meta.productId
      const ctrl = new AbortController()
      st.abortCtrl = ctrl
      st.inflightId = intent
      forceRerender()

      try {
        let res: Response
        if (target <= 0) {
          if (!wasExists) {
            // Nothing to delete server-side. Settle locally.
            st.inflightId = st.intentId
            st.abortCtrl = null
            forceRerender()
            return
          }
          res = await smartFetch(
            `/api/cart/items/${encodeURIComponent(sku)}`,
            { method: 'DELETE', signal: ctrl.signal },
          )
        } else if (wasExists) {
          res = await smartFetch(
            `/api/cart/items/${encodeURIComponent(sku)}`,
            {
              method: 'PATCH',
              body: JSON.stringify({ quantity: target }),
              signal: ctrl.signal,
            },
          )
        } else {
          if (!productId) {
            // No productId means we never received a meta block. Settle and
            // bail — caller must supply productId on addItem.
            st.targetQty = 0
            st.inflightId = st.intentId
            st.abortCtrl = null
            forceRerender()
            return
          }
          res = await smartFetch('/api/cart/items', {
            method: 'POST',
            body: JSON.stringify({
              productId,
              variantSku: sku,
              quantity: target,
            }),
            signal: ctrl.signal,
          })
        }

        const data = (await res.json().catch(() => null)) as
          | ServerCartResponse
          | null
        const stale = st.intentId !== intent

        if (stale) {
          // A newer user intent arrived while we were in flight. Discard this
          // response entirely; the next send for this SKU will resolve it.
          st.abortCtrl = null
          if (st.timer === null) scheduleSendRef.current(sku, 0)
          return
        }

        if (!res.ok || !data?.success) {
          // Roll back to last known good state.
          st.targetQty = st.serverQty
          st.inflightId = st.intentId
          st.abortCtrl = null
          if (data?.error) setError(data.error)
          forceRerender()
          return
        }

        st.abortCtrl = null
        // applyServerCart will sync targetQty for this SKU because it's idle.
        applyServerCart(data)

        // If anything new was queued between response receipt and now, kick it.
        const after = skuStates.current.get(sku)
        if (after && after.intentId !== after.inflightId && !after.timer) {
          scheduleSendRef.current(sku, 0)
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') {
          // Aborted because a newer click superseded us — do nothing.
          return
        }
        if (st.intentId === intent) {
          st.targetQty = st.serverQty
          st.inflightId = st.intentId
          st.abortCtrl = null
          setError(err instanceof Error ? err.message : 'Network error')
          forceRerender()
        }
      } finally {
        drainPendingResolves()
      }
    },
    [applyServerCart, drainPendingResolves, forceRerender],
  )

  const scheduleSend = useCallback(
    (sku: string, delay: number = DEBOUNCE_MS) => {
      const st = skuStates.current.get(sku)
      if (!st) return
      if (st.timer) clearTimeout(st.timer)
      st.timer = setTimeout(() => {
        st.timer = null
        void sendForSku(sku)
      }, delay)
    },
    [sendForSku],
  )

  // Keep ref in sync so sendForSku can call back into scheduleSend.
  useEffect(() => {
    scheduleSendRef.current = scheduleSend
  }, [scheduleSend])

  const bumpIntent = useCallback(
    (sku: string, newTarget: number, meta?: Partial<CartItem>) => {
      const st = getOrCreate(sku)
      st.targetQty = Math.max(0, Math.floor(newTarget))
      st.intentId += 1
      if (meta) st.meta = { ...st.meta, ...meta }
      if (st.abortCtrl) {
        st.abortCtrl.abort()
        st.abortCtrl = null
      }
      scheduleSend(sku)
      setError(null)
      forceRerender()
    },
    [getOrCreate, scheduleSend, forceRerender],
  )

  const addItem = useCallback(
    async ({ productId, variantSku, quantity = 1, meta }: AddItemArgs) => {
      const st = getOrCreate(variantSku)
      const nextTarget = st.targetQty + quantity
      bumpIntent(variantSku, nextTarget, {
        ...meta,
        productId,
        variantSku,
      })
      setIsOpen(true)
      return { ok: true }
    },
    [bumpIntent, getOrCreate],
  )

  const updateQty = useCallback(
    (sku: string, qty: number) => {
      bumpIntent(sku, qty)
    },
    [bumpIntent],
  )

  const removeItem = useCallback(
    (sku: string) => {
      bumpIntent(sku, 0)
    },
    [bumpIntent],
  )

  const fetchCart = useCallback(async () => {
    try {
      const res = await smartFetch('/api/cart')
      const data = await res.json()
      if (data.success) {
        applyServerCart(data)
        setError(null)
      }
    } catch {
      /* silent — guests with no session get empty cart */
    } finally {
      setLoading(false)
    }
  }, [applyServerCart])

  // Initial fetch + guest cart merge on login.
  useEffect(() => {
    if (authLoading) return
    if (user && !mergedRef.current) {
      mergedRef.current = true
      const sessionId = peekGuestSessionId()
      if (sessionId) {
        smartFetch('/api/cart/merge', {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        })
          .then((res) => {
            if (res.ok) clearGuestSessionId()
          })
          .catch(() => {})
          .finally(() => {
            void fetchCart()
          })
      } else {
        void fetchCart()
      }
      return
    }
    if (!user) mergedRef.current = false
    void fetchCart()
  }, [user, authLoading, fetchCart])

  // Cancel everything on unmount.
  useEffect(() => {
    const states = skuStates.current
    return () => {
      for (const st of states.values()) {
        if (st.abortCtrl) st.abortCtrl.abort()
        if (st.timer) clearTimeout(st.timer)
      }
    }
  }, [])

  const applyVoucher = useCallback(
    async (code: string) => {
      try {
        const res = await smartFetch(
          `/api/cart?voucherCode=${encodeURIComponent(code)}`,
        )
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) {
          return { ok: false, error: data?.error || 'Invalid voucher' }
        }
        applyServerCart(data)
        return { ok: true }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Network error',
        }
      }
    },
    [applyServerCart],
  )

  const removeVoucher = useCallback(
    async (code: string) => {
      const res = await smartFetch(
        `/api/cart?removeVoucher=${encodeURIComponent(code)}`,
      )
      const data = await res.json().catch(() => null)
      if (data?.success) applyServerCart(data)
    },
    [applyServerCart],
  )

  const clearCart = useCallback(async () => {
    const res = await smartFetch('/api/cart', { method: 'DELETE' })
    const data = await res.json().catch(() => null)
    if (data?.success) {
      for (const st of skuStates.current.values()) {
        if (st.abortCtrl) st.abortCtrl.abort()
        if (st.timer) clearTimeout(st.timer)
      }
      skuStates.current.clear()
      setServerCart(EMPTY)
      forceRerender()
    }
  }, [forceRerender])

  const flush = useCallback(async () => {
    // Force any debounced timer to fire immediately.
    for (const sku of skuStates.current.keys()) {
      const st = skuStates.current.get(sku)
      if (st?.timer) {
        clearTimeout(st.timer)
        st.timer = null
        void sendForSku(sku)
      }
    }
    if (!anyPending()) {
      // Re-fetch once to make sure server view is canonical before checkout.
      await fetchCart()
      return
    }
    await new Promise<void>((resolve) => {
      pendingResolves.current.push(resolve)
    })
    await fetchCart()
  }, [sendForSku, anyPending, fetchCart])

  // ── Derived optimistic state ───────────────────────────────────────────
  const optimisticItems = useMemo<CartItem[]>(() => {
    const map = new Map<string, CartItem>()
    for (const item of serverCart.items) {
      map.set(item.variantSku, item)
    }
    for (const [sku, st] of skuStates.current.entries()) {
      if (st.targetQty <= 0) {
        map.delete(sku)
        continue
      }
      const existing = map.get(sku)
      if (existing) {
        if (existing.quantity !== st.targetQty) {
          map.set(sku, { ...existing, quantity: st.targetQty })
        }
      } else if (st.meta?.productId) {
        map.set(sku, {
          variantSku: sku,
          productId: st.meta.productId,
          quantity: st.targetQty,
          name: st.meta.name ?? '',
          variantLabel: st.meta.variantLabel ?? '',
          price: st.meta.price ?? 0,
          image: st.meta.image ?? '',
          slug: st.meta.slug,
          brand: st.meta.brand,
        })
      }
    }
    return Array.from(map.values())
    // bump intentionally drives recompute on per-SKU mutation
  }, [serverCart.items, bump])

  const optimisticSubtotal = useMemo(
    () => optimisticItems.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0),
    [optimisticItems],
  )

  const optimisticItemCount = useMemo(
    () => optimisticItems.reduce((s, i) => s + i.quantity, 0),
    [optimisticItems],
  )

  const isSyncing = useMemo(() => anyPending(), [bump, anyPending])

  // When fully synced we trust the server total (includes discounts/voucher
  // logic). While syncing we compute an optimistic total client-side so the
  // UI feels instant; backend remains the source of truth at checkout.
  const optimisticTotal = isSyncing
    ? Math.max(0, optimisticSubtotal - serverCart.discount)
    : serverCart.total

  const value = useMemo<CartContextType>(
    () => ({
      items: optimisticItems,
      subtotal: optimisticSubtotal,
      total: optimisticTotal,
      itemCount: optimisticItemCount,
      discount: serverCart.discount,
      vouchers: serverCart.vouchers,
      totalItems: optimisticItemCount,
      totalPrice: optimisticTotal,
      loading,
      error,
      isOpen,
      isSyncing,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleCart: () => setIsOpen((o) => !o),
      addItem,
      updateQty,
      removeItem,
      clearCart,
      applyVoucher,
      removeVoucher,
      refresh: fetchCart,
      flush,
    }),
    [
      optimisticItems,
      optimisticSubtotal,
      optimisticTotal,
      optimisticItemCount,
      serverCart.discount,
      serverCart.vouchers,
      loading,
      error,
      isOpen,
      isSyncing,
      addItem,
      updateQty,
      removeItem,
      clearCart,
      applyVoucher,
      removeVoucher,
      fetchCart,
      flush,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
