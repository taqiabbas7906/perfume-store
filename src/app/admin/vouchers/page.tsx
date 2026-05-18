'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { AdminTableSkeleton } from '@/components/ui/Skeleton'

interface Voucher {
  _id: string
  code: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
  minOrderAmount: number
  maxDiscountAmount?: number
  usageLimit?: number
  usedCount: number
  perUserLimit?: number
  expiresAt?: string
  startsAt?: string
  active: boolean
  stackable: boolean
  firstOrderOnly: boolean
  productIds?: string[]
  categoryIds?: string[]
  customerIds?: string[]
  createdAt: string
}

const EMPTY_FORM = {
  code: '',
  type: 'percentage' as Voucher['type'],
  value: 0,
  minOrderAmount: 0,
  maxDiscountAmount: '',
  usageLimit: '',
  perUserLimit: '',
  expiresAt: '',
  startsAt: '',
  active: true,
  stackable: false,
  firstOrderOnly: false,
}

export default function AdminVouchersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchVouchers = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/vouchers')
      const data = await res.json()
      if (data.success) setVouchers(data.vouchers)
    } catch {}
  }, [])

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return
      try {
        const res = await authFetch('/api/auth/me')
        const data = await res.json()
        if (data.user?.role === 'admin') {
          setIsAdmin(true)
          await fetchVouchers()
        } else {
          router.push('/')
        }
      } catch {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [user, router, fetchVouchers])

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEdit = (v: Voucher) => {
    setEditId(v._id)
    setForm({
      code: v.code,
      type: v.type,
      value: v.value,
      minOrderAmount: v.minOrderAmount,
      maxDiscountAmount: v.maxDiscountAmount?.toString() ?? '',
      usageLimit: v.usageLimit?.toString() ?? '',
      perUserLimit: v.perUserLimit?.toString() ?? '',
      expiresAt: v.expiresAt ? v.expiresAt.slice(0, 10) : '',
      startsAt: v.startsAt ? v.startsAt.slice(0, 10) : '',
      active: v.active,
      stackable: v.stackable,
      firstOrderOnly: v.firstOrderOnly,
    })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const payload: any = {
      code: form.code || undefined,
      type: form.type,
      value: Number(form.value),
      minOrderAmount: Number(form.minOrderAmount),
      active: form.active,
      stackable: form.stackable,
      firstOrderOnly: form.firstOrderOnly,
    }
    if (form.maxDiscountAmount) payload.maxDiscountAmount = Number(form.maxDiscountAmount)
    if (form.usageLimit) payload.usageLimit = Number(form.usageLimit)
    if (form.perUserLimit) payload.perUserLimit = Number(form.perUserLimit)
    if (form.expiresAt) payload.expiresAt = form.expiresAt
    if (form.startsAt) payload.startsAt = form.startsAt
    if (editId) payload.voucherId = editId

    try {
      const res = await authFetch('/api/admin/vouchers', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Failed'); setSaving(false); return }
      setSuccess(editId ? 'Voucher updated!' : 'Voucher created!')
      setShowForm(false)
      await fetchVouchers()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (v: Voucher) => {
    try {
      await authFetch('/api/admin/vouchers', {
        method: 'PUT',
        body: JSON.stringify({ voucherId: v._id, active: !v.active }),
      })
      await fetchVouchers()
    } catch {}
  }

  const fmt = (n: number) => `$${n.toFixed(2)}`
  const fmtDiscount = (v: Voucher) =>
    v.type === 'percentage' ? `${v.value}%` : v.type === 'fixed' ? fmt(v.value) : 'Free Shipping'

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <AdminTableSkeleton rows={6} />
      </div>
    )
  }
  if (!isAdmin) return null

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vouchers</h1>
          <p className="text-gray-500 text-sm mt-1">{vouchers.length} total</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="text-blue-600 hover:underline text-sm">← Dashboard</Link>
          <button
            onClick={openCreate}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            + New Voucher
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-8 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-5">{editId ? 'Edit Voucher' : 'Create Voucher'}</h2>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code <span className="text-gray-400 font-normal">(auto-generated if empty)</span></label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. FREESHIP"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as Voucher['type'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.type === 'percentage' ? 'Discount %' : form.type === 'fixed' ? 'Discount Amount ($)' : 'Value (set 0 for free shipping)'}
              </label>
              <input
                type="number" min="0" step={form.type === 'percentage' ? '1' : '0.01'}
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.minOrderAmount}
                onChange={e => setForm(f => ({ ...f, minOrderAmount: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount ($) <span className="text-gray-400 font-normal">optional</span></label>
              <input
                type="number" min="0" step="0.01"
                value={form.maxDiscountAmount}
                onChange={e => setForm(f => ({ ...f, maxDiscountAmount: e.target.value }))}
                placeholder="No limit"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Usage Limit <span className="text-gray-400 font-normal">optional</span></label>
              <input
                type="number" min="1"
                value={form.usageLimit}
                onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                placeholder="Unlimited"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uses Per User <span className="text-gray-400 font-normal">optional — max times one user can apply this voucher</span>
              </label>
              <input
                type="number" min="1"
                value={form.perUserLimit}
                onChange={e => setForm(f => ({ ...f, perUserLimit: e.target.value }))}
                placeholder="Unlimited"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starts At <span className="text-gray-400 font-normal">optional</span></label>
              <input
                type="date"
                value={form.startsAt}
                onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At <span className="text-gray-400 font-normal">optional</span></label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="font-medium">Active</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.stackable} onChange={e => setForm(f => ({ ...f, stackable: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="font-medium">Stackable</span> <span className="text-gray-400">(can combine with others)</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.firstOrderOnly} onChange={e => setForm(f => ({ ...f, firstOrderOnly: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="font-medium">First Order Only</span>
              </label>
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : editId ? 'Update Voucher' : 'Create Voucher'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-300 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left py-3 px-4">Code</th>
              <th className="text-left py-3 px-4">Discount</th>
              <th className="text-left py-3 px-4">Min Order</th>
              <th className="text-left py-3 px-4">Usage</th>
              <th className="text-left py-3 px-4">Per User</th>
              <th className="text-left py-3 px-4">Expires</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400">No vouchers yet</td>
              </tr>
            )}
            {vouchers.map(v => (
              <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <span className="font-mono font-semibold text-gray-900">{v.code}</span>
                  {v.stackable && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">stackable</span>}
                  {v.firstOrderOnly && <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">1st order</span>}
                </td>
                <td className="py-3 px-4 font-medium">{fmtDiscount(v)}</td>
                <td className="py-3 px-4 text-gray-500">{v.minOrderAmount > 0 ? fmt(v.minOrderAmount) : '—'}</td>
                <td className="py-3 px-4 text-gray-500">
                  {v.usedCount}{v.usageLimit ? `/${v.usageLimit}` : ''}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {v.perUserLimit ? (
                    <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded font-medium">
                      {v.perUserLimit}x per user
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : '—'}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => toggleActive(v)}
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      v.active
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    } transition-colors`}
                  >
                    {v.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => openEdit(v)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
