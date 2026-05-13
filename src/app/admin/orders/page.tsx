'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface AdminOrder {
  _id: string
  status: string
  paymentStatus: string
  totalAmount: number
  currency: string
  createdAt: string
  guestEmail?: string
  user?: { name?: string; email?: string }
  shippingAddress?: { name: string; country: string; phone: string; city: string }
  trackingNumber?: string
  trackingCarrier?: string
  items: Array<{ name: string; quantity: number }>
}

interface ListResponse {
  success: boolean
  orders: AdminOrder[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  error?: string
}

const STATUS_CHOICES = ['pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled', 'refunded']

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-800',
    paid:      'bg-green-100 text-green-800',
    shipped:   'bg-blue-100 text-blue-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    failed:    'bg-red-100 text-red-800',
    refunded:  'bg-amber-100 text-amber-800',
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })

  // Filters
  const [status, setStatus]       = useState('')
  const [country, setCountry]     = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [query, setQuery]         = useState('')
  const [page, setPage]           = useState(1)

  // Action panels
  const [trackingFor, setTrackingFor] = useState<AdminOrder | null>(null)
  const [cancelFor, setCancelFor]     = useState<AdminOrder | null>(null)
  const [actionError, setActionError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setActionError('')
    try {
      const sp = new URLSearchParams()
      sp.set('page', String(page))
      sp.set('limit', '20')
      if (status)    sp.set('status', status)
      if (country)   sp.set('country', country)
      if (query)     sp.set('q', query)
      if (startDate) sp.set('startDate', new Date(startDate).toISOString())
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        sp.set('endDate', end.toISOString())
      }

      const res = await authFetch(`/api/admin/orders?${sp.toString()}`)
      const data: ListResponse = await res.json()
      if (data.success) {
        setOrders(data.orders)
        setPagination(data.pagination)
      } else {
        setActionError(data.error || 'Failed to load orders')
      }
    } catch {
      setActionError('Network error')
    } finally {
      setLoading(false)
    }
  }, [status, country, query, startDate, endDate, page])

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return
      try {
        const res = await authFetch('/api/auth/me')
        const data = await res.json()
        if (data.user?.role === 'admin') {
          setIsAdmin(true)
        } else {
          router.push('/')
        }
      } catch {
        router.push('/')
      } finally {
        setAuthChecked(true)
      }
    }
    checkAdmin()
  }, [user, router])

  useEffect(() => {
    if (isAdmin) fetchOrders()
  }, [isAdmin, fetchOrders])

  const resetFilters = () => {
    setStatus(''); setCountry(''); setStartDate(''); setEndDate(''); setQuery(''); setPage(1)
  }

  if (!authChecked) {
    return <div className="container mx-auto px-4 py-8 text-center text-gray-500">Checking access…</div>
  }
  if (!isAdmin) return null

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
          <select
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
          >
            <option value="">All statuses</option>
            {STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Country</label>
          <input
            type="text"
            placeholder="US, GB, PK…"
            value={country}
            onChange={e => { setCountry(e.target.value); setPage(1) }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(1) }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(1) }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Search</label>
          <input
            type="text"
            placeholder="email, tracking, name…"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          />
        </div>
        <button
          onClick={resetFilters}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-100"
        >
          Reset
        </button>
      </div>

      {actionError && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{actionError}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-50 border border-gray-200 rounded-xl">
          No orders match your filters.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left py-3 px-3">Order</th>
                <th className="text-left py-3 px-3">Date</th>
                <th className="text-left py-3 px-3">Customer</th>
                <th className="text-left py-3 px-3">Country</th>
                <th className="text-left py-3 px-3">Total</th>
                <th className="text-left py-3 px-3">Status</th>
                <th className="text-left py-3 px-3">Tracking</th>
                <th className="text-left py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3 font-mono text-xs text-gray-600">
                    <Link href={`/admin/orders/${o._id}`} className="text-blue-600 hover:underline">
                      #{o._id.slice(-8).toUpperCase()}
                    </Link>
                    <div className="text-[10px] text-gray-400 mt-0.5">{o.items.length} item{o.items.length === 1 ? '' : 's'}</div>
                  </td>
                  <td className="py-3 px-3 text-gray-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-gray-900">{o.user?.name ?? o.shippingAddress?.name ?? '—'}</div>
                    <div className="text-xs text-gray-500">{o.user?.email ?? o.guestEmail ?? '—'}</div>
                    {o.shippingAddress?.phone && <div className="text-xs text-gray-400">{o.shippingAddress.phone}</div>}
                  </td>
                  <td className="py-3 px-3">{o.shippingAddress?.country ?? '—'}</td>
                  <td className="py-3 px-3 font-medium">${o.totalAmount.toFixed(2)}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${statusBadge(o.status)}`}>{o.status}</span>
                  </td>
                  <td className="py-3 px-3 text-xs">
                    {o.trackingNumber
                      ? <>
                          <div className="font-mono">{o.trackingNumber}</div>
                          <div className="text-gray-400">{o.trackingCarrier}</div>
                        </>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="py-3 px-3 space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => setTrackingFor(o)}
                      disabled={!['paid', 'shipped'].includes(o.status)}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {o.trackingNumber ? 'Edit tracking' : 'Add tracking'}
                    </button>
                    <button
                      onClick={() => setCancelFor(o)}
                      disabled={['cancelled', 'delivered', 'refunded'].includes(o.status)}
                      className="px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm">
          <span className="text-gray-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders
          </span>
          <div className="space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {trackingFor && (
        <TrackingModal
          order={trackingFor}
          onClose={() => setTrackingFor(null)}
          onSaved={() => { setTrackingFor(null); fetchOrders() }}
        />
      )}

      {cancelFor && (
        <CancelModal
          order={cancelFor}
          onClose={() => setCancelFor(null)}
          onSaved={() => { setCancelFor(null); fetchOrders() }}
        />
      )}
    </div>
  )
}

/* ─────────────────── Tracking modal ─────────────────── */
function TrackingModal({
  order, onClose, onSaved,
}: {
  order: AdminOrder
  onClose: () => void
  onSaved: () => void
}) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '')
  const [trackingCarrier, setTrackingCarrier] = useState(order.trackingCarrier ?? '')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (trackingNumber.trim().length < 3) { setError('Tracking number is too short'); return }
    if (trackingCarrier.trim().length < 2) { setError('Carrier is required'); return }

    setSaving(true)
    try {
      const res = await authFetch(`/api/admin/orders/${order._id}/tracking`, {
        method: 'PATCH',
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim(),
          trackingCarrier: trackingCarrier.trim(),
          trackingUrl: trackingUrl.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onSaved()
      } else {
        setError(data.error || 'Failed to save tracking')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title={order.trackingNumber ? 'Update tracking' : 'Add tracking number'}>
      <form onSubmit={handleSave} className="space-y-4 text-sm">
        <p className="text-gray-500">
          Order <span className="font-mono">#{order._id.slice(-8).toUpperCase()}</span> — adding tracking
          will mark the order as <strong>shipped</strong> and notify the customer by email.
        </p>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tracking number</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            placeholder="1Z999AA10123456784"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Carrier</label>
          <input
            type="text"
            value={trackingCarrier}
            onChange={e => setTrackingCarrier(e.target.value)}
            placeholder="UPS, FedEx, DHL, USPS…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tracking URL (optional)</label>
          <input
            type="url"
            value={trackingUrl}
            onChange={e => setTrackingUrl(e.target.value)}
            placeholder="https://carrier.com/track/…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-lg">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Saving…' : 'Save & notify customer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ─────────────────── Cancel modal ─────────────────── */
function CancelModal({
  order, onClose, onSaved,
}: {
  order: AdminOrder
  onClose: () => void
  onSaved: () => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await authFetch(`/api/admin/orders/${order._id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        onSaved()
      } else {
        setError(data.error || 'Failed to cancel')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Cancel order">
      <form onSubmit={handleCancel} className="space-y-4 text-sm">
        <p className="text-gray-500">
          Cancelling order <span className="font-mono">#{order._id.slice(-8).toUpperCase()}</span> will restore
          its inventory and email the customer.
        </p>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Customer request, out of stock, fraud check failed…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-lg">
            Keep order
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Cancelling…' : 'Confirm cancel'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ─────────────────── Modal shell ─────────────────── */
function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
