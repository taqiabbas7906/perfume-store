'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { authFetch } from '@/lib/api'

type AdminStaffRole = 'super_admin' | 'manager' | 'support'
type AccessRole = 'customer' | AdminStaffRole
type Permission =
  | 'all'
  | 'products'
  | 'orders'
  | 'reviews'
  | 'vouchers'
  | 'analytics'
  | 'users'
  | 'search-sync'

interface AdminUser {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  adminRole?: AdminStaffRole
  permissions?: Permission[]
  active: boolean
  lastLogin?: string
  createdAt?: string
}

interface Counts {
  all: number
  active: number
  admins: number
  customers: number
  super_admin: number
  manager: number
  support: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

interface UserFormState {
  name: string
  email: string
  role: AccessRole
  permissions: Permission[]
  active: boolean
}

const PAGE_SIZE = 20

const roleColors: Record<AccessRole, string> = {
  customer: 'bg-gray-100 text-gray-600',
  super_admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  support: 'bg-green-50 text-green-700',
}

const allPermissions: Permission[] = [
  'products',
  'orders',
  'reviews',
  'vouchers',
  'analytics',
  'users',
  'search-sync',
]

const managerDefaults: Permission[] = [
  'products',
  'orders',
  'reviews',
  'vouchers',
  'analytics',
]

const supportDefaults: Permission[] = ['orders', 'reviews', 'vouchers']

const emptyCounts: Counts = {
  all: 0,
  active: 0,
  admins: 0,
  customers: 0,
  super_admin: 0,
  manager: 0,
  support: 0,
}

const emptyPagination: Pagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
}

const emptyForm: UserFormState = {
  name: '',
  email: '',
  role: 'support',
  permissions: supportDefaults,
  active: true,
}

function defaultPermissionsFor(role: AdminStaffRole): Permission[] {
  if (role === 'super_admin') return ['all']
  return role === 'manager' ? managerDefaults : supportDefaults
}

function accessRole(user: AdminUser): AccessRole {
  if (user.role !== 'admin') return 'customer'
  return user.adminRole ?? 'super_admin'
}

function staffRole(user: AdminUser): AdminStaffRole {
  return user.adminRole ?? 'super_admin'
}

function userPermissions(user: AdminUser): Permission[] {
  if (user.role !== 'admin') return []
  const role = staffRole(user)
  if (role === 'super_admin') return ['all']
  return user.permissions?.length ? user.permissions : defaultPermissionsFor(role)
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'A'
  )
}

function roleLabel(role: AccessRole) {
  if (role === 'customer') return 'Customer'
  return role.replace('_', ' ')
}

function formatDate(value?: string) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function userToForm(user: AdminUser): UserFormState {
  const role = accessRole(user)
  return {
    name: user.name,
    email: user.email,
    role,
    permissions: userPermissions(user),
    active: user.active,
  }
}

export default function UsersPanel() {
  const [userList, setUserList] = useState<AdminUser[]>([])
  const [counts, setCounts] = useState<Counts>(emptyCounts)
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<'' | AccessRole>('')
  const [page, setPage] = useState(1)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm)

  const loadUsers = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        })
        if (search.trim()) params.set('q', search.trim())
        if (filterRole === 'customer') {
          params.set('role', 'user')
        } else if (filterRole) {
          params.set('role', 'admin')
          params.set('adminRole', filterRole)
        }

        const res = await authFetch(`/api/admin/users?${params.toString()}`)
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load users')
        }

        setUserList((data.users ?? []) as AdminUser[])
        setCounts({ ...emptyCounts, ...(data.counts ?? {}) })
        if (data.pagination) {
          setPagination({
            ...emptyPagination,
            ...data.pagination,
            totalPages: Math.max(1, data.pagination.totalPages ?? 1),
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [filterRole, page, search],
  )

  useEffect(() => {
    const t = setTimeout(() => {
      void loadUsers()
    }, 250)
    return () => clearTimeout(t)
  }, [loadUsers])

  function markBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function openCreateModal() {
    setEditingUser(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  function handleEdit(user: AdminUser) {
    setEditingUser(user)
    setForm(userToForm(user))
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    if (saving) return
    setShowModal(false)
    setEditingUser(null)
    setForm(emptyForm)
  }

  function togglePermission(perm: Permission) {
    if (form.permissions.includes('all')) return
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((permission) => permission !== perm)
        : [...prev.permissions, perm],
    }))
  }

  function changeRole(role: AccessRole) {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: role === 'customer' ? [] : defaultPermissionsFor(role),
    }))
  }

  async function toggleActive(user: AdminUser) {
    markBusy(user._id, true)
    setError('')
    try {
      const res = await authFetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !user.active }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user')
      }
      const updatedUser = data.user as AdminUser
      setUserList((prev) =>
        prev.map((candidate) =>
          candidate._id === updatedUser._id ? updatedUser : candidate,
        ),
      )
      void loadUsers(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      markBusy(user._id, false)
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        name: form.name.trim(),
        role: form.role === 'customer' ? 'user' : 'admin',
        adminRole: form.role === 'customer' ? undefined : form.role,
        permissions:
          form.role === 'customer'
            ? undefined
            : form.role === 'super_admin'
              ? ['all']
              : form.permissions,
        active: form.active,
      }

      if (!payload.name) throw new Error('Name is required')
      if (!editingUser && !form.email.trim()) throw new Error('Email is required')

      const res = await authFetch(
        editingUser ? `/api/admin/users/${editingUser._id}` : '/api/admin/users',
        {
          method: editingUser ? 'PATCH' : 'POST',
          body: JSON.stringify(
            editingUser
              ? payload
              : {
                  ...payload,
                  email: form.email.trim().toLowerCase(),
                },
          ),
        },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save user')
      }

      const savedUser = data.user as AdminUser
      setUserList((prev) =>
        editingUser
          ? prev.map((user) => (user._id === savedUser._id ? savedUser : user))
          : [savedUser, ...prev],
      )
      setShowModal(false)
      setEditingUser(null)
      setForm(emptyForm)
      void loadUsers(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const start =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const end = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-charcoal-900">Users</h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Manage customers, admin users, and permissions
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line" />
          </span>
          Add User
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-paper-200 p-4 text-center">
          <p className="text-xl font-serif font-semibold text-charcoal-900">
            {counts.all}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
            Total Users
          </p>
        </div>
        <div className="bg-white rounded-lg border border-paper-200 p-4 text-center">
          <p className="text-xl font-serif font-semibold text-charcoal-900">
            {counts.active}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
            Active
          </p>
        </div>
        <div className="bg-white rounded-lg border border-paper-200 p-4 text-center">
          <p className="text-xl font-serif font-semibold text-charcoal-900">
            {counts.admins}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
            Admins
          </p>
        </div>
        <div className="bg-white rounded-lg border border-paper-200 p-4 text-center">
          <p className="text-xl font-serif font-semibold text-charcoal-900">
            {counts.customers}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
            Customers
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-paper-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-charcoal-400">
            <i className="ri-search-line" />
          </span>
          <input
            type="text"
            placeholder="Search all users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-paper-50 border border-paper-300 pl-9 pr-4 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value as '' | AccessRole)
            setPage(1)
          }}
          className="bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-700 rounded focus:outline-none focus:border-gold-400"
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="super_admin">Super Admin</option>
          <option value="manager">Manager</option>
          <option value="support">Support</option>
        </select>
        <button
          onClick={() => void loadUsers()}
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
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Permissions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Last Login</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                      <i className="ri-loader-4-line animate-spin" />
                      Loading users...
                    </span>
                  </td>
                </tr>
              )}
              {!loading &&
                userList.map((user) => {
                  const role = accessRole(user)
                  const permissions = userPermissions(user)
                  const busy = busyIds.has(user._id)
                  return (
                    <tr
                      key={user._id}
                      className="border-b border-paper-100 last:border-0 hover:bg-paper-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center text-sm font-semibold">
                            {initials(user.name)}
                          </div>
                          <div>
                            <p className="font-medium text-charcoal-900">{user.name}</p>
                            <p className="text-xs text-charcoal-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${
                            roleColors[role] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {roleLabel(role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {role === 'customer' ? (
                            <span className="text-[10px] bg-paper-100 text-charcoal-500 px-2 py-0.5 rounded">
                              No admin access
                            </span>
                          ) : permissions.includes('all') ? (
                            <span className="text-[10px] bg-charcoal-900 text-white px-2 py-0.5 rounded">
                              All Access
                            </span>
                          ) : (
                            permissions.slice(0, 3).map((perm) => (
                              <span
                                key={perm}
                                className="text-[10px] bg-paper-200 text-charcoal-600 px-2 py-0.5 rounded"
                              >
                                {perm}
                              </span>
                            ))
                          )}
                          {permissions.length > 3 && !permissions.includes('all') && (
                            <span className="text-[10px] text-charcoal-400">
                              +{permissions.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-charcoal-600">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void toggleActive(user)}
                          disabled={busy}
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-50 ${
                            user.active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {busy ? 'Saving...' : user.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-charcoal-500 hover:text-gold-600 transition-colors"
                        >
                          <span className="w-5 h-5 flex items-center justify-center">
                            <i className="ri-edit-line" />
                          </span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {!loading && userList.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
              <i className="ri-user-settings-line" />
            </div>
            <p className="text-sm text-charcoal-500">
              No users found.
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
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-paper-200">
              <h3 className="font-serif text-lg font-medium text-charcoal-900">
                {editingUser ? 'Edit User' : 'Add User'}
              </h3>
              <button
                onClick={closeModal}
                disabled={saving}
                className="text-charcoal-400 hover:text-charcoal-700 transition-colors disabled:opacity-50"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-close-line" />
                </span>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    disabled={editingUser != null}
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400 disabled:text-charcoal-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => changeRole(e.target.value as AccessRole)}
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                  >
                    {editingUser && <option value="customer">Customer</option>}
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Manager</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                {form.role !== 'super_admin' && (
                  <div>
                    <label className="text-xs font-medium text-charcoal-700 block mb-2">
                      Permissions
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {allPermissions.map((perm) => (
                        <label
                          key={perm}
                          className="flex items-center gap-2 text-sm text-charcoal-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(perm)}
                            onChange={() => togglePermission(perm)}
                            className="w-4 h-4 accent-gold-500"
                          />
                          <span className="capitalize">{perm.replace('-', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-charcoal-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, active: e.target.checked }))
                    }
                    className="w-4 h-4 accent-gold-500"
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-paper-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="text-sm text-charcoal-600 hover:text-charcoal-900 px-4 py-2 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
