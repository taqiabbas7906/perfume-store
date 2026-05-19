'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { authFetch } from '@/lib/api'
import type { OrderStatus, PaymentStatus } from '@/types'

const PAGE_SIZE = 20

const statusOptions: OrderStatus[] = [
  'pending',
  'paid',
  'failed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'failed', 'cancelled'],
  paid: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  failed: ['pending', 'cancelled'],
  cancelled: [],
  refunded: [],
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  shipped: 'bg-blue-50 text-blue-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-amber-50 text-amber-700',
}

const paymentColors: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  authorized: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  canceled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-amber-50 text-amber-700',
}

interface AdminOrderUser {
  _id?: string
  name?: string
  email?: string
  phone?: string
}

interface AdminOrderItem {
  productId?: string
  variantSku?: string
  variantLabel?: string
  name: string
  image?: string
  price: number
  quantity: number
  subtotal: number
}

interface AdminShippingAddress {
  name: string
  address: string
  city: string
  state?: string
  country: string
  zip: string
  phone: string
}

interface AdminOrderStatusEntry {
  status: OrderStatus
  changedAt: string
  changedBy?: 'system' | 'admin' | 'customer' | 'webhook'
  note?: string
}

interface AdminOrder {
  _id: string
  user?: AdminOrderUser | string | null
  guestEmail?: string
  items: AdminOrderItem[]
  shippingAddress: AdminShippingAddress
  status: OrderStatus
  paymentStatus: PaymentStatus
  subtotal: number
  discount: number
  shipping: number
  tax: number
  totalAmount: number
  currency: string
  paymentIntentId?: string
  squarePaymentId?: string
  squareOrderId?: string
  paymentError?: string
  paidAt?: string
  trackingNumber?: string
  trackingCarrier?: string
  trackingUrl?: string
  shippedAt?: string
  cancelledAt?: string
  cancelReason?: string
  statusHistory?: AdminOrderStatusEntry[]
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function emptyStatusCounts(): Record<OrderStatus, number> {
  return statusOptions.reduce(
    (acc, status) => {
      acc[status] = 0
      return acc
    },
    {} as Record<OrderStatus, number>,
  )
}

function orderNumber(id: string) {
  return `#${id.slice(-8).toUpperCase()}`
}

function customerName(order: AdminOrder) {
  if (order.user && typeof order.user === 'object' && order.user.name) {
    return order.user.name
  }
  return order.shippingAddress?.name ?? 'Guest customer'
}

function customerEmail(order: AdminOrder) {
  if (order.user && typeof order.user === 'object' && order.user.email) {
    return order.user.email
  }
  return order.guestEmail ?? 'No email'
}

function formatMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function addressText(address: AdminShippingAddress) {
  return [
    address.name,
    address.address,
    [address.city, address.state, address.zip].filter(Boolean).join(', '),
    address.country,
    address.phone,
  ].filter(Boolean)
}

export default function OrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [statusCounts, setStatusCounts] =
    useState<Record<OrderStatus, number>>(emptyStatusCounts)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | OrderStatus>('')
  const [page, setPage] = useState(1)

  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingCarrier, setTrackingCarrier] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')

  const loadOrders = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        })
        if (search.trim()) params.set('q', search.trim())
        if (filterStatus) params.set('status', filterStatus)

        const res = await authFetch(`/api/admin/orders?${params.toString()}`)
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load orders')
        }

        setOrders((data.orders ?? []) as AdminOrder[])
        setStatusCounts({
          ...emptyStatusCounts(),
          ...(data.statusCounts ?? {}),
        })
        if (data.pagination) {
          setPagination({
            page: data.pagination.page,
            limit: data.pagination.limit,
            total: data.pagination.total,
            totalPages: Math.max(1, data.pagination.totalPages),
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [filterStatus, page, search],
  )

  useEffect(() => {
    const t = setTimeout(() => {
      void loadOrders()
    }, 250)
    return () => clearTimeout(t)
  }, [loadOrders])

  const start =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const end = Math.min(pagination.page * pagination.limit, pagination.total)

  function syncUpdatedOrder(order: AdminOrder) {
    setSelectedOrder(order)
    setOrders((prev) =>
      prev.map((candidate) =>
        candidate._id === order._id ? { ...candidate, ...order } : candidate,
      ),
    )
  }

  async function openOrderDetail(order: AdminOrder) {
    setSelectedOrder(order)
    setDetailLoading(true)
    setError('')
    setStatusNote('')
    setCancelReason('')
    try {
      const res = await authFetch(`/api/admin/orders/${order._id}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load order details')
      }
      const nextOrder = data.order as AdminOrder
      setSelectedOrder(nextOrder)
      setTrackingNumber(nextOrder.trackingNumber ?? '')
      setTrackingCarrier(nextOrder.trackingCarrier ?? '')
      setTrackingUrl(nextOrder.trackingUrl ?? '')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load order details',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setSelectedOrder(null)
    setDetailLoading(false)
    setBusy(false)
    setStatusNote('')
    setCancelReason('')
  }

  async function updateStatus(status: OrderStatus) {
    if (!selectedOrder) return
    setBusy(true)
    setError('')
    try {
      const res = await authFetch(`/api/admin/orders/${selectedOrder._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          note: statusNote.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order status')
      }
      syncUpdatedOrder(data.order as AdminOrder)
      setStatusNote('')
      void loadOrders(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update order status',
      )
    } finally {
      setBusy(false)
    }
  }

  async function cancelOrder() {
    if (!selectedOrder) return
    setBusy(true)
    setError('')
    try {
      const reason = cancelReason.trim()
      const res = await authFetch(
        `/api/admin/orders/${selectedOrder._id}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify(reason ? { reason } : {}),
        },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order')
      }
      syncUpdatedOrder(data.order as AdminOrder)
      setCancelReason('')
      void loadOrders(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order')
    } finally {
      setBusy(false)
    }
  }

  async function saveTracking(e: FormEvent) {
    e.preventDefault()
    if (!selectedOrder) return
    setBusy(true)
    setError('')
    try {
      const res = await authFetch(
        `/api/admin/orders/${selectedOrder._id}/tracking`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            trackingNumber: trackingNumber.trim(),
            trackingCarrier: trackingCarrier.trim(),
            trackingUrl: trackingUrl.trim(),
          }),
        },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save tracking')
      }
      syncUpdatedOrder(data.order as AdminOrder)
      void loadOrders(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tracking')
    } finally {
      setBusy(false)
    }
  }

  const actionableStatuses = selectedOrder
    ? nextStatuses[selectedOrder.status].filter(
        (status) => status !== 'cancelled' && status !== 'shipped',
      )
    : []
  const canCancel =
    selectedOrder != null &&
    nextStatuses[selectedOrder.status].includes('cancelled')
  const canSaveTracking =
    selectedOrder?.status === 'paid' || selectedOrder?.status === 'shipped'

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-medium text-charcoal-900">
          Orders
        </h1>
        <p className="text-sm text-charcoal-500 mt-1">
          Track and manage customer orders
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(filterStatus === status ? '' : status)
              setPage(1)
            }}
            className={`bg-white rounded-lg border p-3 text-center transition-colors ${
              filterStatus === status
                ? 'border-gold-400 bg-gold-50'
                : 'border-paper-200 hover:border-paper-300'
            }`}
          >
            <p className="text-xl font-serif font-semibold text-charcoal-900">
              {statusCounts[status]}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
              {status}
            </p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-paper-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-charcoal-400">
            <i className="ri-search-line" />
          </span>
          <input
            type="text"
            placeholder="Search orders, customers, phone, tracking..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-paper-50 border border-paper-300 pl-9 pr-4 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as '' | OrderStatus)
            setPage(1)
          }}
          className="bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-700 rounded focus:outline-none focus:border-gold-400"
        >
          <option value="">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button
          onClick={() => void loadOrders()}
          disabled={loading}
          className="border border-paper-300 text-charcoal-700 text-xs uppercase tracking-wider px-4 py-2 hover:border-gold-300 hover:text-charcoal-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className={loading ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} />
          </span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700 text-lg leading-none"
          >
            x
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-paper-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-50 border-b border-paper-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                      <i className="ri-loader-4-line animate-spin" />
                      Loading orders...
                    </span>
                  </td>
                </tr>
              )}
              {!loading &&
                orders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-paper-100 last:border-0 hover:bg-paper-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal-900">
                        {orderNumber(order._id)}
                      </p>
                      <p className="text-xs text-charcoal-400 font-mono">
                        {order._id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-charcoal-900">{customerName(order)}</p>
                      <p className="text-xs text-charcoal-400">
                        {customerEmail(order)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-charcoal-700">
                        {order.items.length} item{order.items.length === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-charcoal-900">
                      {formatMoney(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${statusColors[order.status]}`}
                        >
                          {order.status}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${paymentColors[order.paymentStatus]}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-charcoal-600">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void openOrderDetail(order)}
                        className="text-xs text-gold-700 hover:text-gold-800 font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && orders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
              <i className="ri-search-line" />
            </div>
            <p className="text-sm text-charcoal-500">
              No orders found matching your criteria.
            </p>
          </div>
        )}

        {!loading && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-paper-200 bg-paper-50/40">
            <p className="text-xs text-charcoal-500">
              Showing <span className="font-medium text-charcoal-700">{start}</span>-
              <span className="font-medium text-charcoal-700">{end}</span> of{' '}
              <span className="font-medium text-charcoal-700">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page <= 1}
                className="px-2 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                title="First"
              >
                First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-xs text-charcoal-700 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs text-charcoal-600">
                Page <span className="font-medium text-charcoal-900">{pagination.page}</span>{' '}
                of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs text-charcoal-700 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Next
              </button>
              <button
                onClick={() => setPage(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                title="Last"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[92vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-paper-200">
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-400">
                  Order Detail
                </p>
                <h3 className="font-serif text-xl font-medium text-charcoal-900">
                  {orderNumber(selectedOrder._id)}
                </h3>
                <p className="text-xs text-charcoal-500 mt-1">
                  Placed {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${statusColors[selectedOrder.status]}`}
                >
                  {selectedOrder.status}
                </span>
                <button
                  onClick={closeDetail}
                  disabled={busy}
                  className="text-charcoal-400 hover:text-charcoal-700 transition-colors disabled:opacity-50"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-close-line" />
                  </span>
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                  <i className="ri-loader-4-line animate-spin" />
                  Loading order details...
                </span>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider">
                        Customer
                      </h4>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${paymentColors[selectedOrder.paymentStatus]}`}
                      >
                        Payment {selectedOrder.paymentStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-charcoal-500 text-xs mb-1">Name</p>
                        <p className="font-medium text-charcoal-900">
                          {customerName(selectedOrder)}
                        </p>
                      </div>
                      <div>
                        <p className="text-charcoal-500 text-xs mb-1">Email</p>
                        <p className="font-medium text-charcoal-900">
                          {customerEmail(selectedOrder)}
                        </p>
                      </div>
                      <div>
                        <p className="text-charcoal-500 text-xs mb-1">Phone</p>
                        <p className="text-charcoal-700">
                          {selectedOrder.shippingAddress.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-charcoal-500 text-xs mb-1">Last update</p>
                        <p className="text-charcoal-700">
                          {formatDate(selectedOrder.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Items
                    </h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div
                          key={`${item.variantSku ?? item.name}-${index}`}
                          className="flex items-center gap-3 p-3 bg-paper-50 rounded-lg"
                        >
                          {item.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-paper-100 text-paper-400 flex items-center justify-center shrink-0">
                              <i className="ri-shopping-bag-line" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-charcoal-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-charcoal-500">
                              {(item.variantLabel || item.variantSku || 'Variant')}{' '}
                              x {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-charcoal-900">
                              {formatMoney(item.subtotal, selectedOrder.currency)}
                            </p>
                            <p className="text-xs text-charcoal-400">
                              {formatMoney(item.price, selectedOrder.currency)} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Timeline
                    </h4>
                    {selectedOrder.statusHistory?.length ? (
                      <div className="space-y-3">
                        {selectedOrder.statusHistory
                          .slice()
                          .reverse()
                          .map((entry, index) => (
                            <div
                              key={`${entry.status}-${entry.changedAt}-${index}`}
                              className="flex gap-3"
                            >
                              <span
                                className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[entry.status].split(' ')[0]}`}
                              />
                              <div>
                                <p className="text-sm font-medium text-charcoal-900 capitalize">
                                  {entry.status}
                                </p>
                                <p className="text-xs text-charcoal-500">
                                  {formatDate(entry.changedAt)} by{' '}
                                  {entry.changedBy ?? 'system'}
                                </p>
                                {entry.note && (
                                  <p className="text-xs text-charcoal-600 mt-1">
                                    {entry.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-charcoal-500">
                        No timeline entries yet.
                      </p>
                    )}
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Order Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-charcoal-500">
                        <span>Subtotal</span>
                        <span>{formatMoney(selectedOrder.subtotal, selectedOrder.currency)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>Discount</span>
                          <span>-{formatMoney(selectedOrder.discount, selectedOrder.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-charcoal-500">
                        <span>Shipping</span>
                        <span>{formatMoney(selectedOrder.shipping, selectedOrder.currency)}</span>
                      </div>
                      <div className="flex justify-between text-charcoal-500">
                        <span>Tax</span>
                        <span>{formatMoney(selectedOrder.tax, selectedOrder.currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-charcoal-900 pt-3 border-t border-paper-200">
                        <span>Total</span>
                        <span>{formatMoney(selectedOrder.totalAmount, selectedOrder.currency)}</span>
                      </div>
                    </div>
                  </section>

                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Shipping Address
                    </h4>
                    <div className="text-sm text-charcoal-700 leading-relaxed">
                      {addressText(selectedOrder.shippingAddress).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </section>

                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Actions
                    </h4>
                    <textarea
                      rows={2}
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Optional status note"
                      className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400 mb-3"
                    />
                    <div className="flex flex-wrap gap-2">
                      {actionableStatuses.map((status) => (
                        <button
                          key={status}
                          onClick={() => void updateStatus(status)}
                          disabled={busy}
                          className={`text-xs uppercase tracking-wider px-3 py-2 rounded font-medium transition-colors disabled:opacity-50 ${statusColors[status]}`}
                        >
                          Mark {status}
                        </button>
                      ))}
                      {actionableStatuses.length === 0 && (
                        <p className="text-sm text-charcoal-500">
                          No direct status actions available.
                        </p>
                      )}
                    </div>

                    {canCancel && (
                      <div className="mt-4 pt-4 border-t border-paper-200">
                        <input
                          type="text"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Cancellation reason"
                          className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400 mb-2"
                        />
                        <button
                          onClick={() => void cancelOrder()}
                          disabled={busy}
                          className="bg-red-600 text-white text-xs uppercase tracking-wider px-4 py-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </section>

                  <section className="border border-paper-200 rounded-lg p-5 bg-white">
                    <h4 className="text-xs font-semibold text-charcoal-600 uppercase tracking-wider mb-4">
                      Tracking
                    </h4>
                    {selectedOrder.trackingNumber && (
                      <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">
                        <p className="font-medium">
                          {selectedOrder.trackingCarrier} {selectedOrder.trackingNumber}
                        </p>
                        {selectedOrder.trackingUrl && (
                          <a
                            href={selectedOrder.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline"
                          >
                            Open tracking
                          </a>
                        )}
                      </div>
                    )}
                    {canSaveTracking ? (
                      <form onSubmit={saveTracking} className="space-y-3">
                        <input
                          type="text"
                          required
                          minLength={3}
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Tracking number"
                          className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                        />
                        <input
                          type="text"
                          required
                          minLength={2}
                          value={trackingCarrier}
                          onChange={(e) => setTrackingCarrier(e.target.value)}
                          placeholder="Carrier"
                          className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                        />
                        <input
                          type="url"
                          value={trackingUrl}
                          onChange={(e) => setTrackingUrl(e.target.value)}
                          placeholder="Tracking URL"
                          className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-full bg-charcoal-900 text-white text-xs uppercase tracking-wider px-4 py-2.5 hover:bg-charcoal-800 transition-colors disabled:opacity-50"
                        >
                          {selectedOrder.status === 'paid'
                            ? 'Save Tracking and Ship'
                            : 'Update Tracking'}
                        </button>
                      </form>
                    ) : (
                      <p className="text-sm text-charcoal-500">
                        Tracking can be added after the order is paid.
                      </p>
                    )}
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
