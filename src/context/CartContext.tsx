'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getGuestSessionId, smartFetch } from '@/lib/api'
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
}

interface CartContextType extends CartSummary {
  loading: boolean
  isOpen: boolean
  error: string | null
  totalItems: number
  totalPrice: number
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  addItem: (args: AddItemArgs) => Promise<{ ok: boolean; error?: string }>
  updateQty: (sku: string, qty: number) => Promise<void>
  removeItem: (sku: string) => Promise<void>
  clearCart: () => Promise<void>
  applyVoucher: (code: string) => Promise<{ ok: boolean; error?: string }>
  removeVoucher: (code: string) => Promise<void>
  refresh: () => Promise<void>
}

const EMPTY: CartSummary = {
  items: [],
  subtotal: 0,
  total: 0,
  itemCount: 0,
  discount: 0,
  vouchers: [],
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [summary, setSummary] = useState<CartSummary>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const mergedRef = useRef(false)

  const fetchCart = useCallback(async () => {
    try {
      const res = await smartFetch('/api/cart')
      const data = await res.json()
      if (data.success) {
        setSummary({
          items: data.items ?? [],
          subtotal: data.subtotal ?? 0,
          total: data.total ?? 0,
          itemCount: data.itemCount ?? 0,
          discount: data.discount ?? 0,
          vouchers: data.vouchers ?? [],
        })
        setError(null)
      }
    } catch {
      // silent — empty cart fallback
    } finally {
      setLoading(false)
    }
  }, [])

  // Merge guest cart on login
  useEffect(() => {
    if (authLoading) return
    if (user && !mergedRef.current) {
      mergedRef.current = true
      const sessionId = getGuestSessionId()
      if (sessionId) {
        smartFetch('/api/cart/merge', {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        })
          .catch(() => {})
          .finally(fetchCart)
      } else {
        fetchCart()
      }
      return
    }
    if (!user) mergedRef.current = false
    fetchCart()
  }, [user, authLoading, fetchCart])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const toggleCart = useCallback(() => setIsOpen((o) => !o), [])

  const addItem = useCallback(
    async ({ productId, variantSku, quantity = 1 }: AddItemArgs) => {
      try {
        const res = await smartFetch('/api/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId, variantSku, quantity }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          return { ok: false, error: data.error || 'Failed to add to cart' }
        }
        setSummary({
          items: data.items ?? [],
          subtotal: data.subtotal ?? 0,
          total: data.total ?? 0,
          itemCount: data.itemCount ?? 0,
          discount: data.discount ?? 0,
          vouchers: data.vouchers ?? [],
        })
        setIsOpen(true)
        return { ok: true }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Network error'
        return { ok: false, error: message }
      }
    },
    [],
  )

  const removeItem = useCallback(async (sku: string) => {
    const res = await smartFetch(`/api/cart/items/${encodeURIComponent(sku)}`, {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => null)
    if (data?.success) {
      setSummary({
        items: data.items ?? [],
        subtotal: data.subtotal ?? 0,
        total: data.total ?? 0,
        itemCount: data.itemCount ?? 0,
        discount: data.discount ?? 0,
        vouchers: data.vouchers ?? [],
      })
    }
  }, [])

  const updateQty = useCallback(
    async (sku: string, qty: number) => {
      if (qty < 1) {
        await removeItem(sku)
        return
      }
      const res = await smartFetch(
        `/api/cart/items/${encodeURIComponent(sku)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ quantity: qty }),
        },
      )
      const data = await res.json().catch(() => null)
      if (data?.success) {
        setSummary({
          items: data.items ?? [],
          subtotal: data.subtotal ?? 0,
          total: data.total ?? 0,
          itemCount: data.itemCount ?? 0,
          discount: data.discount ?? 0,
          vouchers: data.vouchers ?? [],
        })
      }
    },
    [removeItem],
  )

  const clearCart = useCallback(async () => {
    const res = await smartFetch('/api/cart', { method: 'DELETE' })
    const data = await res.json().catch(() => null)
    if (data?.success) setSummary(EMPTY)
  }, [])

  const applyVoucher = useCallback(async (code: string) => {
    const res = await smartFetch(
      `/api/cart?voucherCode=${encodeURIComponent(code)}`,
    )
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      return { ok: false, error: data?.error || 'Invalid voucher' }
    }
    setSummary({
      items: data.items ?? [],
      subtotal: data.subtotal ?? 0,
      total: data.total ?? 0,
      itemCount: data.itemCount ?? 0,
      discount: data.discount ?? 0,
      vouchers: data.vouchers ?? [],
    })
    return { ok: true }
  }, [])

  const removeVoucher = useCallback(async (code: string) => {
    const res = await smartFetch(
      `/api/cart?removeVoucher=${encodeURIComponent(code)}`,
    )
    const data = await res.json().catch(() => null)
    if (data?.success) {
      setSummary({
        items: data.items ?? [],
        subtotal: data.subtotal ?? 0,
        total: data.total ?? 0,
        itemCount: data.itemCount ?? 0,
        discount: data.discount ?? 0,
        vouchers: data.vouchers ?? [],
      })
    }
  }, [])

  const value = useMemo<CartContextType>(
    () => ({
      ...summary,
      totalItems: summary.itemCount,
      totalPrice: summary.total,
      loading,
      error,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateQty,
      removeItem,
      clearCart,
      applyVoucher,
      removeVoucher,
      refresh: fetchCart,
    }),
    [
      summary,
      loading,
      error,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateQty,
      removeItem,
      clearCart,
      applyVoucher,
      removeVoucher,
      fetchCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
