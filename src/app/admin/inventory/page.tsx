'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { AdminTableSkeleton } from '@/components/ui/Skeleton'

type FilterType = 'all' | 'out_of_stock' | 'low_stock' | 'expiring'

interface InventoryItem {
  productId: string
  productName: string
  productSlug: string
  brand: string
  variantSku: string
  variantLabel: string
  quantity: number
  threshold: number
  expiresAt?: string
  daysLeft?: number
  status: 'out_of_stock' | 'low_stock' | 'expiring_soon'
}

interface InventoryLog {
  _id: string
  productName: string
  variantSku: string
  variantLabel: string
  delta: number
  quantityBefore: number
  quantityAfter: number
  reason: string
  adminId?: { name: string; email: string }
  orderId?: { _id: string }
  note?: string
  createdAt: string
}

interface Summary {
  outOfStockCount: number
  lowStockCount: number
  expiringSoonCount: number
  totalActiveProducts: number
}

export default function AdminInventoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  // Adjustment modal
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null)
  const [newQty, setNewQty] = useState('')
  const [newThreshold, setNewThreshold] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjusting_, setAdjusting_] = useState(false)
  const [adjustError, setAdjustError] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState('')

  useEffect(() => {
    if (authLoading) return
    authFetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user?.role === 'admin') setIsAdmin(true)
      else router.push('/')
    }).catch(() => router.push('/'))
  }, [user, authLoading, router])

  const fetchData = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/admin/inventory?filter=${filter}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.items ?? [])
        setSummary(data.summary)
        if (data.recentLogs) setLogs(data.recentLogs)
      }
    } catch {}
    finally { setLoading(false) }
  }, [isAdmin, filter])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdjust = (item: InventoryItem) => {
    setAdjusting(item)
    setNewQty(String(item.quantity))
    setNewThreshold(String(item.threshold))
    setAdjustNote('')
    setAdjustError('')
    setAdjustSuccess('')
  }

  const handleAdjust = async () => {
    if (!adjusting) return
    setAdjusting_(true)
    setAdjustError('')
    try {
      const res = await authFetch(`/api/admin/products/${adjusting.productSlug}/inventory`, {
        method: 'PATCH',
        body: JSON.stringify({
          variantSku:        adjusting.variantSku,
          newQuantity:       Number(newQty),
          lowStockThreshold: newThreshold ? Number(newThreshold) : undefined,
          note:              adjustNote || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setAdjustError(data.error ?? 'Failed'); return }
      setAdjustSuccess(`Updated: ${data.quantityBefore} → ${data.quantityAfter}`)
      fetchData()
      setTimeout(() => setAdjusting(null), 1500)
    } catch { setAdjustError('Request failed') }
    finally { setAdjusting_(false) }
  }

  const statusColor = (s: string) => ({
    out_of_stock:  { bg: '#fef2f2', text: '#dc2626', badge: '#fee2e2', badgeText: '#b91c1c' },
    low_stock:     { bg: '#fffbeb', text: '#d97706', badge: '#fef3c7', badgeText: '#92400e' },
    expiring_soon: { bg: '#eff6ff', text: '#2563eb', badge: '#dbeafe', badgeText: '#1e40af' },
  }[s] ?? { bg: '#f9fafb', text: '#6b7280', badge: '#f3f4f6', badgeText: '#374151' })

  if (authLoading || !isAdmin || loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <AdminTableSkeleton rows={6} />
      </div>
    )
  }

  const reasonLabel: Record<string, string> = {
    order_placed:      '🛒 Order',
    order_cancelled:   '↩️ Cancelled',
    order_refunded:    '💸 Refunded',
    manual_adjustment: '✏️ Manual',
    restock:           '📦 Restock',
    rollback:          '⚠️ Rollback',
    expiry_removal:    '🗑 Expired',
    system_correction: '🔧 System',
  }

  const FILTERS: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all',          label: 'All Issues',   count: (summary?.outOfStockCount ?? 0) + (summary?.lowStockCount ?? 0) },
    { key: 'out_of_stock', label: 'Out of Stock', count: summary?.outOfStockCount },
    { key: 'low_stock',    label: 'Low Stock',    count: summary?.lowStockCount },
    { key: 'expiring',     label: 'Expiring Soon',count: summary?.expiringSoonCount },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Inventory</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            {summary?.totalActiveProducts ?? '—'} active products
          </p>
        </div>
        <a href="/admin" style={{ fontSize: 13, color: '#6b7280' }}>← Dashboard</a>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Out of Stock', value: summary.outOfStockCount, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Low Stock',    value: summary.lowStockCount,   color: '#d97706', bg: '#fffbeb' },
            { label: 'Expiring Soon',value: summary.expiringSoonCount, color: '#2563eb', bg: '#eff6ff' },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f9fafb', padding: 4, borderRadius: 10, marginBottom: 20, width: 'fit-content' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
              background: filter === f.key ? '#111827' : 'transparent',
              color: filter === f.key ? '#fff' : '#6b7280',
              fontWeight: 500,
            }}>
            {f.label}{f.count != null ? ` (${f.count})` : ''}
          </button>
        ))}
      </div>

      {/* Items table */}
      {loading
        ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Loading…</p>
        : items.length === 0
          ? <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12, color: '#16a34a' }}>
              ✓ No {filter === 'all' ? 'stock issues' : filter.replace('_', ' ')} found
            </div>
          : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Product', 'Brand', 'Variant / SKU', 'Stock', 'Threshold', 'Status', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#374151', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const c = statusColor(item.status)
                    return (
                      <tr key={`${item.variantSku}-${i}`} style={{ borderBottom: '1px solid #f3f4f6', background: c.bg }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.productName}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{item.brand || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div>{item.variantLabel}</div>
                          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af' }}>{item.variantSku}</div>
                          {item.expiresAt && <div style={{ fontSize: 11, color: '#2563eb' }}>Exp: {new Date(item.expiresAt).toLocaleDateString()}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: c.text, fontSize: 16 }}>{item.quantity}</td>
                        <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{item.threshold}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, background: c.badge, color: c.badgeText, fontWeight: 600 }}>
                            {item.status.replace('_', ' ')}
                          </span>
                          {item.daysLeft != null && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>{item.daysLeft}d</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => openAdjust(item)}
                            style={{ padding: '5px 12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                            Adjust
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
      }

      {/* Recent logs */}
      {logs.length > 0 && filter === 'all' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Recent Activity</h2>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Time', 'Product', 'SKU', 'Change', 'Reason', 'By'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11 }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{log.productName}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{log.variantSku}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontWeight: 700, color: log.delta > 0 ? '#16a34a' : '#dc2626' }}>
                        {log.delta > 0 ? `+${log.delta}` : log.delta}
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 6 }}>
                        {log.quantityBefore}→{log.quantityAfter}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{reasonLabel[log.reason] ?? log.reason}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>
                      {log.adminId ? log.adminId.name : log.orderId ? `Order #${log.orderId._id.toString().slice(-6)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjusting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 420, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>Adjust Stock</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
              {adjusting.productName} — {adjusting.variantLabel}
              <span style={{ fontFamily: 'monospace', marginLeft: 8, color: '#9ca3af' }}>{adjusting.variantSku}</span>
            </p>

            {adjustError   && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{adjustError}</div>}
            {adjustSuccess && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{adjustSuccess}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>New Quantity (currently {adjusting.quantity})</label>
                <input type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15, fontWeight: 600, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Low Stock Threshold (currently {adjusting.threshold})</label>
                <input type="number" min="0" value={newThreshold} onChange={e => setNewThreshold(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Note (optional)</label>
                <input placeholder="e.g. Restock from supplier" value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={handleAdjust} disabled={adjusting_}
                style={{ flex: 1, padding: '11px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: adjusting_ ? 0.5 : 1 }}>
                {adjusting_ ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setAdjusting(null)}
                style={{ padding: '11px 20px', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
