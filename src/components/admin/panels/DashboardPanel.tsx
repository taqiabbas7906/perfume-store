'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { authFetch } from '@/lib/api'
import FreeDeliverySettingsCard from './FreeDeliverySettingsCard'
import HomepageSettingsCard from './HomepageSettingsCard'
import OrderInsightsSection from './OrderInsightsSection'

/* ─── types ───────────────────────────────────────── */

type Period = '7d' | '30d' | '90d' | '1y'

interface OverviewResponse {
  success: true
  period: Period
  revenue: { current: number; previous: number; change: number }
  orders: { current: number; previous: number; change: number }
  newUsers: { current: number; previous: number; change: number }
  aov: { current: number; previous: number; change: number }
  totals: { customers: number; products: number }
}

interface RevenuePoint {
  date: string
  revenue: number
  orders: number
}

interface RevenueResponse {
  success: true
  period: Period
  granularity: 'day' | 'week' | 'month'
  series: RevenuePoint[]
}

interface TopProduct {
  _id: string
  name: string
  units: number
  revenue: number
  orderCount: number
  slug?: string
  image?: string
}

interface CollectionSlice {
  _id: string
  name: string
  value: number
}

interface RecentOrder {
  _id: string
  totalAmount: number
  status: string
  createdAt: string
  guestEmail?: string
  shippingAddress?: { name?: string }
  user?: { name?: string; email?: string } | null
}

/* ─── constants ───────────────────────────────────── */

/**
 * Donut palette — distinct hues across the warm-tan brand world so every
 * slice is visually identifiable (the old all-gold scale blended together).
 */
const COLORS = [
  '#C4A882', // signature gold
  '#9C3F4E', // burgundy
  '#0F766E', // deep teal
  '#7E5A8E', // plum
  '#B57463', // terracotta
  '#6E8E7E', // sage
  '#3F3F46', // graphite
]

/** Revenue vs Orders series colors — picked for clear contrast. */
const REVENUE_COLOR = '#C4A882' // warm gold
const ORDERS_COLOR = '#0F766E' // deep teal (distinct from the gold scale)

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '1y': 'Last year',
}

const STATUS_PILL: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-blue-50 text-blue-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-gray-100 text-gray-500',
}

/* ─── helpers ─────────────────────────────────────── */

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

function fmtChange(c: number) {
  const sign = c > 0 ? '+' : ''
  return `${sign}${c}%`
}

function formatTick(date: string, granularity: string) {
  if (granularity === 'day') {
    const d = new Date(date)
    return Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return date
}

function customerName(o: RecentOrder) {
  return (
    o.user?.name ||
    o.shippingAddress?.name ||
    o.user?.email ||
    o.guestEmail ||
    'Customer'
  )
}

function orderRef(id: string) {
  return `#${id.slice(-8).toUpperCase()}`
}

/* ─── component ───────────────────────────────────── */

export default function DashboardPanel() {
  const [period, setPeriod] = useState<Period>('30d')
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [collections, setCollections] = useState<CollectionSlice[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const granularity =
        period === '7d' ? 'day' : period === '1y' ? 'month' : period === '90d' ? 'week' : 'day'

      const [overviewRes, revenueRes, topRes, collRes, ordersRes] = await Promise.all([
        authFetch(`/api/admin/analytics/overview?period=${period}`).then((r) => r.json()),
        authFetch(`/api/admin/analytics/revenue?period=${period}&granularity=${granularity}`).then(
          (r) => r.json(),
        ),
        authFetch(`/api/admin/analytics/top-products?period=${period}&limit=5`).then((r) =>
          r.json(),
        ),
        authFetch(`/api/admin/analytics/revenue-by-collection?period=${period}&limit=4`).then(
          (r) => r.json(),
        ),
        authFetch('/api/admin/orders?limit=5&page=1').then((r) => r.json()),
      ])

      if (!overviewRes.success) throw new Error(overviewRes.error || 'Overview failed')
      if (!revenueRes.success) throw new Error(revenueRes.error || 'Revenue failed')

      setOverview(overviewRes as OverviewResponse)
      setRevenue(revenueRes as RevenueResponse)
      setTopProducts(topRes.success ? (topRes.products as TopProduct[]) : [])
      setCollections(collRes.success ? (collRes.data as CollectionSlice[]) : [])
      setRecentOrders(ordersRes.success ? (ordersRes.orders as RecentOrder[]) : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [period])

  /* Initial load + realtime refresh every 30s while the tab is visible. */
  useEffect(() => {
    let cancelled = false
    const tick = () => {
      if (!cancelled) void loadAll()
    }
    // Defer the first tick so React doesn't see a setState during the effect body
    // (the eslint react-hooks/set-state-in-effect rule trips on a direct call).
    const initial = window.setTimeout(tick, 0)
    const id = window.setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) tick()
    }, 30_000)
    return () => {
      cancelled = true
      window.clearTimeout(initial)
      window.clearInterval(id)
    }
  }, [loadAll])

  /* ─── derived ─── */

  const stats = overview && [
    {
      label: 'Total Revenue',
      value: fmtMoney(overview.revenue.current),
      change: overview.revenue.change,
      icon: 'ri-money-dollar-circle-line',
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Total Orders',
      value: overview.orders.current.toLocaleString(),
      change: overview.orders.change,
      icon: 'ri-shopping-cart-line',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Customers',
      value: overview.totals.customers.toLocaleString(),
      change: overview.newUsers.change,
      icon: 'ri-user-line',
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Products',
      value: overview.totals.products.toLocaleString(),
      change: null as number | null,
      icon: 'ri-box-3-line',
      color: 'bg-orange-50 text-orange-700',
    },
  ]

  const revenueData =
    revenue?.series.map((p) => ({
      ...p,
      label: formatTick(p.date, revenue.granularity),
    })) ?? []

  const totalCollectionRevenue = collections.reduce((s, c) => s + c.value, 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-charcoal-900">Dashboard</h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Overview of your store performance · auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg border border-paper-200 p-1 inline-flex">
            {(['7d', '30d', '90d', '1y'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-charcoal-900 text-white'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => void loadAll()}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center border border-paper-200 rounded-lg text-charcoal-600 hover:text-charcoal-900 hover:bg-paper-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <i className={loading ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {(stats ?? Array.from({ length: 4 }).map(() => null)).map((stat, i) =>
          stat ? (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-paper-200 p-5 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-lg ${stat.color}`}
                >
                  <i className={`${stat.icon} text-lg`} />
                </div>
                {stat.change != null && (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      stat.change >= 0
                        ? 'text-green-600 bg-green-50'
                        : 'text-red-600 bg-red-50'
                    }`}
                  >
                    {fmtChange(stat.change)}
                  </span>
                )}
              </div>
              <p className="text-2xl font-serif font-semibold text-charcoal-900">
                {stat.value}
              </p>
              <p className="text-xs text-charcoal-500 mt-1">{stat.label}</p>
            </div>
          ) : (
            <div
              key={i}
              className="bg-white rounded-lg border border-paper-200 p-5 animate-pulse"
            >
              <div className="w-10 h-10 rounded-lg bg-paper-100 mb-3" />
              <div className="h-6 bg-paper-100 rounded w-24 mb-2" />
              <div className="h-3 bg-paper-100 rounded w-16" />
            </div>
          ),
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue & Orders area chart */}
        <div className="lg:col-span-2 min-w-0 bg-white rounded-lg border border-paper-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-charcoal-900">Revenue &amp; Orders</h3>
              <div className="flex items-center gap-3 text-xs text-charcoal-600">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: REVENUE_COLOR }}
                  />
                  Revenue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: ORDERS_COLOR }}
                  />
                  Orders
                </span>
              </div>
            </div>
            <span className="text-xs text-charcoal-400">{PERIOD_LABELS[period]}</span>
          </div>
          <div className="h-64 min-w-0">
            {revenueData.length > 0 ? (
              <ChartFrame className="h-full w-full">
                {(w, h) => (
                <AreaChart
                  width={w}
                  height={h}
                  data={revenueData}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={REVENUE_COLOR} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={REVENUE_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ORDERS_COLOR} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={ORDERS_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE5" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#818181' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#818181' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#818181' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E8DCCF',
                      fontSize: 12,
                      boxShadow: '0 4px 24px rgba(26,26,26,0.08)',
                    }}
                    formatter={(value, name) => {
                      const n = Number(value) || 0
                      const label = String(name)
                      return label === 'Revenue'
                        ? [fmtMoney(n), 'Revenue']
                        : [n.toLocaleString(), 'Orders']
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={REVENUE_COLOR}
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke={ORDERS_COLOR}
                    strokeWidth={2}
                    fill="url(#ordGrad)"
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                    animationBegin={150}
                  />
                </AreaChart>
                )}
              </ChartFrame>
            ) : (
              <ChartPlaceholder
                loading={loading}
                empty="No revenue activity in this period yet."
              />
            )}
          </div>
        </div>

        {/* Revenue by Collection donut */}
        <div className="min-w-0 bg-white rounded-lg border border-paper-200 p-5">
          <h3 className="text-sm font-semibold text-charcoal-900 mb-4">
            Revenue by Collection
          </h3>
          <div className="h-48 min-w-0">
            {collections.length > 0 ? (
              <ChartFrame className="h-full w-full">
                {(w, h) => (
                <PieChart width={w} height={h}>
                  <Pie
                    data={collections}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    {collections.map((_, idx) => (
                      <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E8DCCF',
                      fontSize: 12,
                    }}
                    formatter={(value) => fmtMoney(Number(value) || 0)}
                  />
                </PieChart>
                )}
              </ChartFrame>
            ) : (
              <ChartPlaceholder loading={loading} empty="No collection revenue yet." />
            )}
          </div>
          {collections.length > 0 && (
            <div className="space-y-2 mt-2">
              {collections.map((c, idx) => {
                const pct =
                  totalCollectionRevenue > 0
                    ? Math.round((c.value / totalCollectionRevenue) * 100)
                    : 0
                return (
                  <div
                    key={c._id}
                    className="flex items-center justify-between text-xs animate-fade-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-charcoal-600 truncate">{c.name}</span>
                    </div>
                    <span className="text-charcoal-900 font-medium whitespace-nowrap">
                      {fmtMoney(c.value)}
                      <span className="text-charcoal-400 ml-1.5">{pct}%</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Store-wide configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <FreeDeliverySettingsCard />
        <HomepageSettingsCard />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg border border-paper-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal-900">Top Products</h3>
            <span className="text-xs text-charcoal-400">{PERIOD_LABELS[period]}</span>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-charcoal-500 py-8 text-center">
              {loading ? 'Loading…' : 'No sales in this period yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div
                  key={product._id}
                  className="flex items-center gap-3 animate-fade-up"
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-semibold text-charcoal-500 bg-paper-100 rounded shrink-0">
                    {idx + 1}
                  </span>
                  {product.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-9 h-9 rounded object-cover shrink-0"
                    />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-charcoal-400">{product.units} sold</p>
                  </div>
                  <span className="text-sm font-semibold text-charcoal-900 whitespace-nowrap">
                    {fmtMoney(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-paper-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal-900">Recent Orders</h3>
            <Link
              href="/admin/orders"
              className="text-xs text-gold-700 hover:text-gold-800 transition-colors"
            >
              View All
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-charcoal-500 py-8 text-center">
              {loading ? 'Loading…' : 'No orders yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, idx) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between py-2 border-b border-paper-100 last:border-0 animate-fade-up"
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">
                      {orderRef(order._id)}
                    </p>
                    <p className="text-xs text-charcoal-400 truncate">{customerName(order)}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-semibold text-charcoal-900">
                      {fmtMoney(order.totalAmount)}
                    </p>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                        STATUS_PILL[order.status] ?? 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed order analytics */}
      <OrderInsightsSection />
    </div>
  )
}

function ChartPlaceholder({ loading, empty }: { loading: boolean; empty: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-sm text-charcoal-500">
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <i className="ri-loader-4-line animate-spin" />
          Loading chart…
        </span>
      ) : (
        empty
      )}
    </div>
  )
}

/**
 * Measures its own box with a ResizeObserver and only renders the recharts
 * chart once it has positive dimensions. Avoids the `width(-1)/height(-1)`
 * warning that `<ResponsiveContainer>` logs when the grid item hasn't laid
 * out yet on the first paint.
 */
function ChartFrame({
  className,
  children,
}: {
  className?: string
  children: (width: number, height: number) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {size.w > 0 && size.h > 0 ? children(size.w, size.h) : null}
    </div>
  )
}
