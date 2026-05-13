'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface UserDetail {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  active: boolean
  phone?: string
  createdAt: string
  lastLogin?: string
  emailVerified?: string
}

interface RecentOrder {
  _id: string
  status: string
  totalAmount: number
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  paid:      'bg-blue-100 text-blue-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded:  'bg-gray-100 text-gray-600',
  failed:    'bg-red-100 text-red-700',
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: authUser } = useAuth()

  const [isAdmin, setIsAdmin]         = useState(false)
  const [checked, setChecked]         = useState(false)
  const [userData, setUserData]       = useState<UserDetail | null>(null)
  const [stats, setStats]             = useState<{ orderCount: number; reviewCount: number } | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [saveMsg, setSaveMsg]         = useState('')

  /* ── admin check ── */
  useEffect(() => {
    if (!authUser) return
    authFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user?.role === 'admin') setIsAdmin(true)
        else router.push('/')
      })
      .catch(() => router.push('/'))
      .finally(() => setChecked(true))
  }, [authUser, router])

  /* ── fetch user data ── */
  useEffect(() => {
    if (!isAdmin || !id) return
    authFetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setUserData(d.user)
          setStats(d.stats)
          setRecentOrders(d.recentOrders ?? [])
        } else {
          setError(d.error || 'User not found')
        }
      })
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false))
  }, [isAdmin, id])

  /* ── patch handler ── */
  const patch = async (update: { role?: 'user' | 'admin'; active?: boolean }) => {
    if (!userData) return
    setSaving(true); setError(''); setSaveMsg('')
    try {
      const res = await authFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(update),
      })
      const d = await res.json()
      if (d.success) {
        setUserData(d.user)
        setSaveMsg('Updated successfully')
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setError(d.error || 'Failed to update')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (!checked) return <div className="container mx-auto px-4 py-8 text-gray-400">Checking access…</div>
  if (!isAdmin) return null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  if (error && !userData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-500">{error}</div>
    )
  }

  if (!userData) return null

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">← Users</Link>
          <h1 className="text-3xl font-bold mt-1">{userData.name}</h1>
          <p className="text-gray-500 text-sm">{userData.email}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${userData.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
            {userData.role}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${userData.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {userData.active ? 'Active' : 'Banned'}
          </span>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
      {saveMsg && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{saveMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: profile + actions ── */}
        <div className="space-y-5">

          {/* Profile card */}
          <div className="border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile</h2>
            <InfoRow label="Name"     value={userData.name} />
            <InfoRow label="Email"    value={userData.email} />
            <InfoRow label="Phone"    value={userData.phone || '—'} />
            <InfoRow label="Joined"   value={new Date(userData.createdAt).toLocaleDateString()} />
            <InfoRow label="Last Login" value={userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : '—'} />
            <InfoRow label="Verified" value={userData.emailVerified ? '✓ Yes' : 'No'} />
          </div>

          {/* Stats */}
          {stats && (
            <div className="border border-gray-200 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{stats.orderCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Orders</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{stats.reviewCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reviews</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</h2>

            {/* Ban / Unban */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Account status</p>
              <button
                onClick={() => patch({ active: !userData.active })}
                disabled={saving}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${userData.active ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'}`}
              >
                {saving ? 'Saving…' : userData.active ? 'Ban this user' : 'Unban this user'}
              </button>
            </div>

            {/* Role change */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Role</p>
              <div className="flex gap-2">
                {(['user', 'admin'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => userData.role !== r && patch({ role: r })}
                    disabled={saving || userData.role === r}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 ${userData.role === r ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
                  >
                    {r[0].toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── Right: recent orders ── */}
        <div className="lg:col-span-2">
          <div className="border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map(o => (
                  <div key={o._id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <div>
                      <Link
                        href={`/admin/orders/${o._id}`}
                        className="text-sm font-medium text-blue-600 hover:underline font-mono"
                      >
                        #{o._id.slice(-10).toUpperCase()}
                      </Link>
                      <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">${o.totalAmount?.toFixed(2) ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {stats && stats.orderCount > 5 && (
              <Link
                href={`/admin/orders?userId=${userData._id}`}
                className="block text-xs text-blue-600 hover:underline mt-3 text-center"
              >
                View all {stats.orderCount} orders →
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}
