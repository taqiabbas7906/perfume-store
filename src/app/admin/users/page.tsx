'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  active: boolean
  phone?: string
  createdAt: string
  lastLogin?: string
}

interface Pagination { total: number; page: number; totalPages: number; hasMore: boolean }

export default function AdminUsersPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [isAdmin, setIsAdmin]       = useState(false)
  const [checked, setChecked]       = useState(false)
  const [users, setUsers]           = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading]       = useState(true)

  // filters
  const [q, setQ]           = useState('')
  const [role, setRole]     = useState('')
  const [active, setActive] = useState('')
  const [page, setPage]     = useState(1)

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

  /* ── fetch users ── */
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({ page: String(page), limit: '20' })
      if (q.trim())  sp.set('q', q.trim())
      if (role)      sp.set('role', role)
      if (active)    sp.set('active', active)
      const res = await authFetch(`/api/admin/users?${sp}`)
      const d = await res.json()
      if (d.success) { setUsers(d.users); setPagination(d.pagination) }
    } catch {}
    finally { setLoading(false) }
  }, [page, q, role, active])

  useEffect(() => { if (isAdmin) fetchUsers() }, [isAdmin, fetchUsers])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchUsers() }

  if (!checked) return <div className="container mx-auto px-4 py-8 text-gray-400">Checking access…</div>
  if (!isAdmin) return null

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Users</h1>
        <Link href="/admin" className="text-blue-600 hover:underline text-sm">← Dashboard</Link>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={active}
          onChange={e => { setActive(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Banned</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Stats bar */}
      {pagination && (
        <p className="text-sm text-gray-500 mb-4">{pagination.total} user{pagination.total !== 1 ? 's' : ''} found</p>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          Loading…
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No users found</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Joined</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Last Login</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{u.name}</td>
                  <td className="py-3 px-4 text-gray-500">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.active ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/users/${u._id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!pagination.hasMore}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
