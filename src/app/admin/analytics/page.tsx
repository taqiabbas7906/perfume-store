'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { AdminTableSkeleton } from '@/components/ui/Skeleton'

/* ─── types ─── */
type Period = 'today' | '7d' | '30d' | '90d'

interface KPI { current: number; previous: number; change: number }

interface Overview {
  period: string
  revenue: KPI
  orders: { current: number; previous: number; change: number; byStatus: Record<string, number> }
  aov: KPI
  newUsers: KPI
}

interface RevenuePoint { date: string; revenue: number; orders: number }

interface TopProduct {
  _id: string; name: string; slug?: string; image?: string
  units: number; revenue: number; orderCount: number
}

interface GeoRow { country: string; orders: number; revenue: number }

interface InventoryData {
  summary: { totalProducts: number; totalVariants: number; totalStock: number }
  outOfStock: { _id: string; name: string; slug: string; image?: string }[]
  lowStock:   { _id: string; name: string; slug: string; image?: string; lowestStock: number; lowVariants: number }[]
}

interface CustomerData {
  newUsers: number; totalUsers: number; returningCustomers: number
  topLTV: { _id: string; name?: string; email?: string; ltv: number; orderCount: number; lastOrder: string }[]
}

/* ─── helpers ─── */
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const num = (n: number) => n.toLocaleString('en-US')

function Change({ v }: { v: number }) {
  if (v === 0) return <span className="text-xs text-gray-400">–</span>
  const up = v > 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(v)}%
    </span>
  )
}

function KpiCard({ title, value, change, sub }: { title: string; value: string; change: number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <div className="flex items-center gap-2">
        <Change v={change} />
        <span className="text-xs text-gray-400">vs prev period</span>
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

/* ─── SVG Bar Chart ─── */
function BarChart({ data }: { data: RevenuePoint[] }) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No data</div>

  const maxRev   = Math.max(...data.map(d => d.revenue), 1)
  const H        = 120
  const barW     = Math.max(2, Math.floor((640 - data.length) / data.length))
  const totalW   = data.length * (barW + 1)
  const showEvery = Math.ceil(data.length / 10)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${totalW} ${H + 24}`} className="w-full" style={{ minWidth: Math.min(totalW, 300) }}>
        {data.map((d, i) => {
          const h  = Math.max(2, Math.round((d.revenue / maxRev) * H))
          const x  = i * (barW + 1)
          const y  = H - h
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={h}
                fill={d.revenue > 0 ? '#111827' : '#e5e7eb'}
                rx={1}
              >
                <title>{d.date}: {fmt(d.revenue)} ({d.orders} orders)</title>
              </rect>
              {i % showEvery === 0 && (
                <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize="8" fill="#9ca3af">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [checked, setChecked]   = useState(false)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [period, setPeriod]     = useState<Period>('30d')

  const [overview,   setOverview]   = useState<Overview | null>(null)
  const [revenue,    setRevenue]    = useState<RevenuePoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [geo,        setGeo]        = useState<GeoRow[]>([])
  const [inventory,  setInventory]  = useState<InventoryData | null>(null)
  const [customers,  setCustomers]  = useState<CustomerData | null>(null)

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  /* ── admin check ── */
  useEffect(() => {
    if (!user) return
    authFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user?.role === 'admin') setIsAdmin(true)
        else router.push('/')
      })
      .catch(() => router.push('/'))
      .finally(() => setChecked(true))
  }, [user, router])

  /* ── fetch all analytics ── */
  const fetchAll = useCallback(async (p: Period) => {
    setLoading(true); setError('')
    try {
      const [ov, rev, top, g, inv, cust] = await Promise.all([
        authFetch(`/api/admin/analytics/overview?period=${p}`).then(r => r.json()),
        authFetch(`/api/admin/analytics/revenue?period=${p}`).then(r => r.json()),
        authFetch(`/api/admin/analytics/top-products?period=${p}&limit=10`).then(r => r.json()),
        authFetch(`/api/admin/analytics/geo?period=${p}`).then(r => r.json()),
        authFetch(`/api/admin/analytics/inventory`).then(r => r.json()),
        authFetch(`/api/admin/analytics/customers?period=${p}`).then(r => r.json()),
      ])
      if (ov.success)   setOverview(ov)
      if (rev.success)  setRevenue(rev.series)
      if (top.success)  setTopProducts(top.products)
      if (g.success)    setGeo(g.countries)
      if (inv.success)  setInventory(inv)
      if (cust.success) setCustomers(cust)
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    queueMicrotask(() => {
      void fetchAll(period)
    })
  }, [isAdmin, period, fetchAll])

  if (!checked || (isAdmin && loading)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <AdminTableSkeleton rows={8} />
      </div>
    )
  }

  if (!isAdmin)  return null

  const PERIODS: { label: string; value: Period }[] = [
    { label: 'Today',   value: 'today' },
    { label: '7 days',  value: '7d' },
    { label: '30 days', value: '30d' },
    { label: '90 days', value: '90d' },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <Link href="/admin" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-1">Analytics</h1>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading analytics…</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── KPI Cards ── */}
          {overview && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Revenue"
                value={fmt(overview.revenue.current)}
                change={overview.revenue.change}
                sub={`Prev: ${fmt(overview.revenue.previous)}`}
              />
              <KpiCard
                title="Orders"
                value={num(overview.orders.current)}
                change={overview.orders.change}
                sub={`Prev: ${num(overview.orders.previous)}`}
              />
              <KpiCard
                title="Avg. Order Value"
                value={fmt(overview.aov.current)}
                change={overview.aov.change}
                sub={`Prev: ${fmt(overview.aov.previous)}`}
              />
              <KpiCard
                title="New Users"
                value={num(overview.newUsers.current)}
                change={overview.newUsers.change}
                sub={`Prev: ${num(overview.newUsers.previous)}`}
              />
            </div>
          )}

          {/* ── Order status breakdown ── */}
          {overview?.orders.byStatus && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Orders by Status</h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(overview.orders.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 rounded-full ${
                      status === 'paid'      ? 'bg-blue-500'    :
                      status === 'shipped'   ? 'bg-indigo-500'  :
                      status === 'delivered' ? 'bg-emerald-500' :
                      status === 'cancelled' ? 'bg-red-400'     :
                      status === 'refunded'  ? 'bg-gray-400'    :
                      'bg-yellow-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Revenue Chart ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue Over Time</h2>
              {revenue.length > 0 && (
                <span className="text-xs text-gray-400">{revenue.length} data points</span>
              )}
            </div>
            <BarChart data={revenue} />
            {revenue.length > 0 && (
              <div className="flex gap-6 mt-3 text-xs text-gray-500">
                <span>Total: <strong className="text-gray-900">{fmt(revenue.reduce((s, d) => s + d.revenue, 0))}</strong></span>
                <span>Orders: <strong className="text-gray-900">{num(revenue.reduce((s, d) => s + d.orders, 0))}</strong></span>
                <span>Peak day: <strong className="text-gray-900">{fmt(Math.max(...revenue.map(d => d.revenue)))}</strong></span>
              </div>
            )}
          </div>

          {/* ── Top Products + Geo ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top Products */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Top Products by Revenue</h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No data</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={p._id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          width={36}
                          height={36}
                          sizes="36px"
                          className="w-9 h-9 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{num(p.units)} units · {p.orderCount} orders</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">{fmt(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Geo */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Orders by Country</h2>
              {geo.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No data</p>
              ) : (
                <div className="space-y-2">
                  {geo.slice(0, 10).map((g) => {
                    const maxOrders = geo[0]?.orders ?? 1
                    const pct = Math.round((g.orders / maxOrders) * 100)
                    return (
                      <div key={g.country} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-28 shrink-0 truncate">{g.country}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-gray-900 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right shrink-0">{g.orders}</span>
                        <span className="text-xs font-medium text-gray-900 w-20 text-right shrink-0">{fmt(g.revenue)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Inventory ── */}
          {inventory && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Inventory Health</h2>

              {/* Summary pills */}
              <div className="flex flex-wrap gap-3 mb-5">
                <div className="bg-gray-50 rounded-lg px-4 py-2 text-center">
                  <p className="text-xl font-bold text-gray-900">{num(inventory.summary.totalProducts)}</p>
                  <p className="text-xs text-gray-500">Active Products</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-2 text-center">
                  <p className="text-xl font-bold text-gray-900">{num(inventory.summary.totalStock)}</p>
                  <p className="text-xs text-gray-500">Total Stock</p>
                </div>
                <div className={`rounded-lg px-4 py-2 text-center ${inventory.outOfStock.length > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <p className={`text-xl font-bold ${inventory.outOfStock.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {inventory.outOfStock.length}
                  </p>
                  <p className="text-xs text-gray-500">Out of Stock</p>
                </div>
                <div className={`rounded-lg px-4 py-2 text-center ${inventory.lowStock.length > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                  <p className={`text-xl font-bold ${inventory.lowStock.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {inventory.lowStock.length}
                  </p>
                  <p className="text-xs text-gray-500">Low Stock</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Out of stock */}
                {inventory.outOfStock.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Out of Stock</p>
                    <div className="space-y-2">
                      {inventory.outOfStock.map(p => (
                        <div key={p._id} className="flex items-center gap-2">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              width={32}
                              height={32}
                              sizes="32px"
                              className="w-8 h-8 rounded-lg object-cover bg-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                          )}
                          <Link href={`/admin/products/${p._id}`} className="text-sm text-gray-700 hover:text-blue-600 truncate flex-1">
                            {p.name}
                          </Link>
                          <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full shrink-0">0 stock</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Low stock */}
                {inventory.lowStock.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Low Stock</p>
                    <div className="space-y-2">
                      {inventory.lowStock.map(p => (
                        <div key={p._id} className="flex items-center gap-2">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              width={32}
                              height={32}
                              sizes="32px"
                              className="w-8 h-8 rounded-lg object-cover bg-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                          )}
                          <Link href={`/admin/products/${p._id}`} className="text-sm text-gray-700 hover:text-blue-600 truncate flex-1">
                            {p.name}
                          </Link>
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                            {p.lowestStock} left
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {inventory.outOfStock.length === 0 && inventory.lowStock.length === 0 && (
                  <p className="text-sm text-emerald-600 col-span-2">✓ All products are well-stocked</p>
                )}
              </div>
            </div>
          )}

          {/* ── Customers ── */}
          {customers && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Customer stats */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customers</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{num(customers.newUsers)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">New (period)</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{num(customers.totalUsers)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{num(customers.returningCustomers)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Returning customers (2+ orders)</p>
                </div>
              </div>

              {/* Top LTV */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Top Customers by LTV</h2>
                {customers.topLTV.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No data</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                          <th className="pb-2 font-medium">Customer</th>
                          <th className="pb-2 font-medium">Orders</th>
                          <th className="pb-2 font-medium">Last Order</th>
                          <th className="pb-2 font-medium text-right">LTV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {customers.topLTV.map((c, i) => (
                          <tr key={c._id}>
                            <td className="py-2">
                              <p className="font-medium text-gray-900">{c.name ?? `Customer #${i + 1}`}</p>
                              {c.email && <p className="text-xs text-gray-400 truncate max-w-[160px]">{c.email}</p>}
                            </td>
                            <td className="py-2 text-gray-600">{c.orderCount}</td>
                            <td className="py-2 text-gray-400 text-xs">{new Date(c.lastOrder).toLocaleDateString()}</td>
                            <td className="py-2 font-semibold text-gray-900 text-right">{fmt(c.ltv)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
