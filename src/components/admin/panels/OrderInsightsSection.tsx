'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { authFetch } from '@/lib/api'
import type { OrderStatus } from '@/types'

type DashboardFilterStatus = '' | OrderStatus

interface Filters {
  startDate: string
  endDate: string
  country: string
  state: string
  status: DashboardFilterStatus
}

interface DashboardSummary {
  totalOrders: number
  totalRevenue: number
  taxCollected: number
  averageOrderValue: number
}

interface RegionBreakdown {
  name: string
  count: number
  revenue: number
}

interface DashboardOrderRow {
  orderId: string
  customerName: string
  customerEmail: string
  createdAt: string
  status: OrderStatus
  paymentStatus: string
  state: string
  country: string
  city: string
  itemCount: number
  subtotal: number
  tax: number
  shipping: number
  totalAmount: number
  currency: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface OrderDashboardResponse {
  success: boolean
  summary: DashboardSummary
  states: RegionBreakdown[]
  countries: RegionBreakdown[]
  orders: DashboardOrderRow[]
  pagination: Pagination
  error?: string
}

const statusOptions: OrderStatus[] = [
  'pending',
  'paid',
  'failed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

const defaultFilters: Filters = {
  startDate: '',
  endDate: '',
  country: '',
  state: '',
  status: '',
}

const PAGE_SIZE = 20

function formatMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

function formatDate(value: string) {
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

function orderRef(orderId: string) {
  return `#${orderId.slice(-8).toUpperCase()}`
}

function buildParams(filters: Filters, limit: number, page = 1) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.country) params.set('country', filters.country)
  if (filters.state) params.set('state', filters.state)
  if (filters.status) params.set('status', filters.status)

  return params
}

export default function OrderInsightsSection() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters)
  const [summary, setSummary] = useState<DashboardSummary>({
    totalOrders: 0,
    totalRevenue: 0,
    taxCollected: 0,
    averageOrderValue: 0,
  })
  const [states, setStates] = useState<RegionBreakdown[]>([])
  const [countries, setCountries] = useState<RegionBreakdown[]>([])
  const [orders, setOrders] = useState<DashboardOrderRow[]>([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const loadInsights = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = buildParams(appliedFilters, PAGE_SIZE, page)
      const res = await authFetch(`/api/admin/analytics/orders-dashboard?${params.toString()}`)
      const data = (await res.json()) as OrderDashboardResponse

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load order insights')
      }

      setSummary(data.summary)
      setStates(data.states ?? [])
      setCountries(data.countries ?? [])
      setOrders(data.orders ?? [])
      setPagination(
        data.pagination ?? {
          page,
          limit: PAGE_SIZE,
          total: data.summary?.totalOrders ?? 0,
          totalPages: Math.max(1, Math.ceil((data.summary?.totalOrders ?? 0) / PAGE_SIZE)),
        },
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load order insights',
      )
    } finally {
      setLoading(false)
    }
  }, [appliedFilters, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInsights()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadInsights])

  const activeFilterCount = useMemo(
    () =>
      Object.values(appliedFilters).filter((value) =>
        typeof value === 'string' ? value.trim().length > 0 : Boolean(value),
      ).length,
    [appliedFilters],
  )

  async function exportCsv() {
    setExporting(true)
    setError('')

    try {
      const params = buildParams(appliedFilters, 5000, 1)
      params.set('format', 'csv')

      const res = await authFetch(`/api/admin/analytics/orders-dashboard?${params.toString()}`)
      if (!res.ok) {
        let message = 'Failed to export CSV'
        try {
          const data = (await res.json()) as { error?: string }
          if (data.error) message = data.error
        } catch {
          // ignore json parse failure and use fallback message
        }
        throw new Error(message)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const parts = ['orders-dashboard']

      if (appliedFilters.startDate) parts.push(appliedFilters.startDate)
      if (appliedFilters.endDate) parts.push(appliedFilters.endDate)

      anchor.href = url
      anchor.download = `${parts.join('-')}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  function handleApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setAppliedFilters(filters)
  }

  function handleReset() {
    setFilters(defaultFilters)
    setPage(1)
    setAppliedFilters(defaultFilters)
  }

  const start =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const end = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <section className="bg-white rounded-lg border border-paper-200 p-5 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-charcoal-900">
            Detailed Order Dashboard
          </h3>
          <p className="text-sm text-charcoal-500 mt-1">
            Filter orders by date, state, country, and status. Export
            the current result set to CSV at any time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-charcoal-500 bg-paper-50 border border-paper-200 rounded-full px-3 py-1">
            {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => void exportCsv()}
            disabled={loading || exporting}
            className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-4 py-2.5 rounded hover:bg-charcoal-800 transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <form
        onSubmit={handleApply}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mb-6"
      >
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-charcoal-500">
            Start date
          </span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
            className="mt-1 w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          />
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-charcoal-500">
            End date
          </span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
            className="mt-1 w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-charcoal-500">
            State
          </span>
          <select
            value={filters.state}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                state: event.target.value,
              }))
            }
            className="mt-1 w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          >
            <option value="">All states</option>
            {states.map((entry) => (
              <option key={entry.name} value={entry.name === 'Unspecified' ? '' : entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-charcoal-500">
            Country
          </span>
          <select
            value={filters.country}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                country: event.target.value,
              }))
            }
            className="mt-1 w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          >
            <option value="">All countries</option>
            {countries.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-charcoal-500">
            Status
          </span>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as DashboardFilterStatus,
              }))
            }
            className="mt-1 w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 xl:col-span-6 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-gold-500 text-charcoal-900 text-xs uppercase tracking-wider px-4 py-2.5 rounded hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Apply filters'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="border border-paper-300 text-charcoal-700 text-xs uppercase tracking-wider px-4 py-2.5 rounded hover:border-gold-300 hover:text-charcoal-900 transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          label="Filtered Orders"
          value={summary.totalOrders.toLocaleString()}
          tone="blue"
        />
        <SummaryCard
          label="Total Revenue"
          value={formatMoney(summary.totalRevenue)}
          tone="green"
        />
        <SummaryCard
          label="Tax Collected"
          value={formatMoney(summary.taxCollected)}
          tone="amber"
        />
        <SummaryCard
          label="Average Order"
          value={formatMoney(summary.averageOrderValue)}
          tone="purple"
        />
        <SummaryCard
          label="Regions Covered"
          value={`${states.length} states · ${countries.length} countries`}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <RegionCard title="States" items={states} loading={loading} />
        <RegionCard title="Countries" items={countries} loading={loading} />
      </div>

      <div className="border border-paper-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-paper-50 border-b border-paper-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-charcoal-900">
              Matching orders
            </h4>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Showing {start}-{end} of {pagination.total} matching orders.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white border-b border-paper-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Order
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  State
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Country
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Tax
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Total
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-charcoal-500">
                    <span className="inline-flex items-center gap-2">
                      <i className="ri-loader-4-line animate-spin" />
                      Loading filtered orders...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-charcoal-500">
                    No orders found for the selected filters.
                  </td>
                </tr>
              )}

              {!loading &&
                orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-paper-100 last:border-0 hover:bg-paper-50/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal-900">
                        {orderRef(order.orderId)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-charcoal-600">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-charcoal-900">{order.customerName}</p>
                      <p className="text-xs text-charcoal-400">
                        {order.customerEmail || 'No email'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-charcoal-600">
                      {order.state || 'Unspecified'}
                    </td>
                    <td className="px-4 py-3 text-charcoal-600">{order.country}</td>
                    <td className="px-4 py-3 text-charcoal-700">
                      {formatMoney(order.tax, order.currency)}
                    </td>
                    <td className="px-4 py-3 font-medium text-charcoal-900">
                      <div>{formatMoney(order.totalAmount, order.currency)}</div>
                      <div className="text-xs font-normal text-charcoal-400 mt-0.5">
                        {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded bg-paper-100 text-charcoal-700">
                          {order.status}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded bg-paper-50 text-charcoal-500">
                          {order.paymentStatus}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

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
                disabled={loading || pagination.page <= 1}
                className="px-2 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                First
              </button>
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || pagination.page <= 1}
                className="px-3 py-1.5 text-xs text-charcoal-700 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs text-charcoal-600">
                Page <span className="font-medium text-charcoal-900">{pagination.page}</span> of{' '}
                {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((current) => Math.min(pagination.totalPages, current + 1))
                }
                disabled={loading || pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs text-charcoal-700 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Next
              </button>
              <button
                onClick={() => setPage(pagination.totalPages)}
                disabled={loading || pagination.page >= pagination.totalPages}
                className="px-2 py-1.5 text-xs text-charcoal-600 hover:bg-paper-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'blue' | 'green' | 'amber' | 'purple' | 'slate'
}) {
  const toneClasses: Record<typeof tone, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    slate: 'bg-slate-50 text-slate-700',
  }

  return (
    <div className="border border-paper-200 rounded-lg p-4">
      <div className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider ${toneClasses[tone]}`}>
        {label}
      </div>
      <p className="mt-3 text-xl font-serif font-semibold text-charcoal-900">
        {value}
      </p>
    </div>
  )
}

function RegionCard({
  title,
  items,
  loading,
}: {
  title: string
  items: RegionBreakdown[]
  loading: boolean
}) {
  return (
    <div className="border border-paper-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h4 className="text-sm font-semibold text-charcoal-900">{title}</h4>
        <span className="text-xs text-charcoal-400">{items.length} listed</span>
      </div>

      {loading ? (
        <div className="text-sm text-charcoal-500">Loading {title.toLowerCase()}...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-charcoal-500">No {title.toLowerCase()} found.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.name}
              className="inline-flex items-center gap-2 rounded-full border border-paper-200 bg-paper-50 px-3 py-1.5 text-xs text-charcoal-700"
            >
              <span>{item.name}</span>
              <span className="text-charcoal-400">
                {item.count} • {formatMoney(item.revenue)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
