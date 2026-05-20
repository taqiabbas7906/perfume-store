'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { authFetch } from '@/lib/api'
import type { VoucherType } from '@/types'

interface AdminVoucher {
  _id: string
  code: string
  type: VoucherType
  value: number
  minOrderAmount: number
  maxDiscountAmount?: number
  usageLimit?: number
  usedCount: number
  perUserLimit?: number
  expiresAt?: string
  startsAt?: string
  active: boolean
  featured: boolean
  stackable: boolean
  firstOrderOnly: boolean
  createdAt?: string
  updatedAt?: string
}

interface VoucherFormState {
  code: string
  type: VoucherType
  value: string
  startsAt: string
  expiresAt: string
  usageLimit: string
  perUserLimit: string
  featured: boolean
  stackable: boolean
}

interface SaveVoucherPayload {
  voucherId?: string
  code?: string
  type: VoucherType
  value: number
  startsAt?: string | null
  expiresAt?: string | null
  usageLimit?: number | null
  perUserLimit?: number | null
  active: boolean
  featured: boolean
  stackable: boolean
}

const emptyForm: VoucherFormState = {
  code: '',
  type: 'percentage',
  value: '',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  perUserLimit: '',
  featured: false,
  stackable: false,
}

const voucherTypeLabels: Record<VoucherType, string> = {
  percentage: 'Percentage',
  fixed: 'Fixed Amount',
  free_shipping: 'Free Shipping',
}

function toInputDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function dateInputToDate(value: string, endOfDay = false) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  )
}

function dateInputToIso(value: string, endOfDay = false) {
  return dateInputToDate(value, endOfDay)?.toISOString()
}

function formatDate(value?: string) {
  if (!value) return 'No expiry'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No expiry'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatVoucherValue(voucher: AdminVoucher) {
  if (voucher.type === 'percentage') return `${voucher.value}%`
  if (voucher.type === 'free_shipping') return 'Free shipping'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(voucher.value)
}

function voucherToForm(voucher: AdminVoucher): VoucherFormState {
  return {
    code: voucher.code,
    type: voucher.type,
    value: String(voucher.value ?? ''),
    startsAt: toInputDate(voucher.startsAt),
    expiresAt: toInputDate(voucher.expiresAt),
    usageLimit: voucher.usageLimit ? String(voucher.usageLimit) : '',
    perUserLimit: voucher.perUserLimit ? String(voucher.perUserLimit) : '',
    featured: Boolean(voucher.featured),
    stackable: Boolean(voucher.stackable),
  }
}

function isExpired(voucher: AdminVoucher) {
  if (!voucher.expiresAt) return false
  const expiresAt = new Date(voucher.expiresAt)
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()
}

function usagePercent(voucher: AdminVoucher) {
  if (!voucher.usageLimit) return 0
  return Math.min(100, (voucher.usedCount / voucher.usageLimit) * 100)
}

function parseOptionalPositiveInt(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${label} must be at least 1`)
  }
  return parsed
}

export default function VouchersPanel() {
  const [voucherList, setVoucherList] = useState<AdminVoucher[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<AdminVoucher | null>(null)
  const [form, setForm] = useState<VoucherFormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<AdminVoucher | null>(null)

  const loadVouchers = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/admin/vouchers')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load vouchers')
      }
      setVoucherList((data.vouchers ?? []) as AdminVoucher[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vouchers')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      void loadVouchers()
    }, 250)
    return () => clearTimeout(t)
  }, [loadVouchers])

  function markBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function openCreateModal() {
    setEditingVoucher(null)
    setForm(emptyForm)
    setShowModal(true)
    setError('')
  }

  function closeModal() {
    if (saving) return
    setShowModal(false)
    setEditingVoucher(null)
    setForm(emptyForm)
  }

  async function toggleActive(voucher: AdminVoucher) {
    markBusy(voucher._id, true)
    setError('')
    try {
      const res = await authFetch('/api/admin/vouchers', {
        method: 'PUT',
        body: JSON.stringify({
          voucherId: voucher._id,
          active: !voucher.active,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update voucher')
      }
      const updatedVoucher = data.voucher as AdminVoucher
      setVoucherList((prev) =>
        prev.map((candidate) =>
          candidate._id === updatedVoucher._id ? updatedVoucher : candidate,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update voucher')
    } finally {
      markBusy(voucher._id, false)
    }
  }

  async function deleteVoucher(voucher: AdminVoucher) {
    markBusy(voucher._id, true)
    setError('')
    try {
      const res = await authFetch(`/api/admin/vouchers/${voucher._id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to delete voucher')
      }
      const updatedVoucher = data.voucher as AdminVoucher
      setVoucherList((prev) =>
        prev.map((candidate) =>
          candidate._id === updatedVoucher._id ? updatedVoucher : candidate,
        ),
      )
      setConfirmDelete(null)
      void loadVouchers(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete voucher')
    } finally {
      markBusy(voucher._id, false)
    }
  }


  function handleEdit(voucher: AdminVoucher) {
    setEditingVoucher(voucher)
    setForm(voucherToForm(voucher))
    setShowModal(true)
    setError('')
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editingVoucher && !form.code.trim()) {
        throw new Error('Code is required when editing a voucher')
      }

      const value =
        form.type === 'free_shipping' ? 0 : Number.parseFloat(form.value)
      if (form.type !== 'free_shipping' && (!Number.isFinite(value) || value < 0)) {
        throw new Error('Enter a valid discount value')
      }

      const startsDate = form.startsAt ? dateInputToDate(form.startsAt) : null
      const expiresDate = form.expiresAt
        ? dateInputToDate(form.expiresAt, true)
        : null
      if (startsDate && expiresDate && startsDate > expiresDate) {
        throw new Error('Valid from must be before valid until')
      }

      const usageLimit = parseOptionalPositiveInt(form.usageLimit, 'Usage limit')
      const perUserLimit = parseOptionalPositiveInt(
        form.perUserLimit,
        'Uses per user',
      )
      const payload: SaveVoucherPayload = {
        ...(editingVoucher ? { voucherId: editingVoucher._id } : {}),
        code: form.code.trim() || undefined,
        type: form.type,
        value,
        startsAt: form.startsAt
          ? dateInputToIso(form.startsAt)
          : editingVoucher
            ? null
            : undefined,
        expiresAt: form.expiresAt
          ? dateInputToIso(form.expiresAt, true)
          : editingVoucher
            ? null
            : undefined,
        usageLimit: usageLimit ?? (editingVoucher ? null : undefined),
        perUserLimit: perUserLimit ?? (editingVoucher ? null : undefined),
        active: editingVoucher?.active ?? true,
        featured: form.featured,
        stackable: form.stackable,
      }

      const res = await authFetch('/api/admin/vouchers', {
        method: editingVoucher ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save voucher')
      }

      const savedVoucher = data.voucher as AdminVoucher
      setVoucherList((prev) =>
        editingVoucher
          ? prev.map((voucher) =>
              voucher._id === savedVoucher._id ? savedVoucher : voucher,
            )
          : [savedVoucher, ...prev],
      )
      setShowModal(false)
      setEditingVoucher(null)
      setForm(emptyForm)
      void loadVouchers(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voucher')
    } finally {
      setSaving(false)
    }
  }

  const activeVouchers = voucherList.filter(
    (voucher) => voucher.active && !isExpired(voucher),
  ).length
  const totalUsed = voucherList.reduce((sum, voucher) => sum + voucher.usedCount, 0)
  const featuredVouchers = voucherList.filter((voucher) => voucher.featured).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-charcoal-900">Vouchers</h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Manage discount codes and promotions
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line" />
          </span>
          Create Voucher
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-paper-200 p-4 text-center">
          <p className="text-xl font-serif font-semibold text-charcoal-900">
            {voucherList.length}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
            Total Vouchers
          </p>
        </div>
        <div className="bg-white rounded-lg border border-paper-200 p-4 text-center">
          <p className="text-xl font-serif font-semibold text-charcoal-900">
            {activeVouchers}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
            Active
          </p>
        </div>
        <div className="bg-white rounded-lg border border-paper-200 p-4 text-center">
          <p className="text-xl font-serif font-semibold text-charcoal-900">{totalUsed}</p>
          <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
            Total Used
          </p>
        </div>
        <div className="bg-white rounded-lg border border-paper-200 p-4 text-center">
          <p className="text-xl font-serif font-semibold text-charcoal-900">
            {featuredVouchers}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-charcoal-500 mt-0.5">
            Featured
          </p>
        </div>
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
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Usage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Valid Until</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Featured</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Stackable</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                      <i className="ri-loader-4-line animate-spin" />
                      Loading vouchers...
                    </span>
                  </td>
                </tr>
              )}
              {!loading &&
                voucherList.map((voucher) => {
                  const busy = busyIds.has(voucher._id)
                  return (
                    <tr
                      key={voucher._id}
                      className="border-b border-paper-100 last:border-0 hover:bg-paper-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-charcoal-900 bg-paper-100 px-2 py-1 rounded">
                          {voucher.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-charcoal-700">
                        {voucherTypeLabels[voucher.type]}
                      </td>
                      <td className="px-4 py-3 text-charcoal-900 font-medium">
                        {formatVoucherValue(voucher)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-charcoal-700">{voucher.usedCount}</span>
                        <span className="text-charcoal-400">
                          {' '}
                          / {voucher.usageLimit ?? 'Unlimited'}
                        </span>
                        <div className="w-20 h-1 bg-paper-200 rounded-full mt-1">
                          <div
                            className="h-full bg-gold-400 rounded-full"
                            style={{ width: `${usagePercent(voucher)}%` }}
                          />
                        </div>
                        {voucher.perUserLimit && (
                          <div className="text-[10px] text-charcoal-400 mt-1">
                            {voucher.perUserLimit} / user
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-charcoal-600">
                        {formatDate(voucher.expiresAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void toggleActive(voucher)}
                          disabled={busy}
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-50 ${
                            voucher.active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {busy ? 'Saving...' : voucher.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${
                            voucher.featured
                              ? 'bg-gold-50 text-gold-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {voucher.featured ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${
                            voucher.stackable
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {voucher.stackable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(voucher)}
                            className="text-charcoal-500 hover:text-gold-600 transition-colors"
                            title="Edit voucher"
                            aria-label={`Edit ${voucher.code}`}
                          >
                            <span className="w-5 h-5 flex items-center justify-center">
                              <i className="ri-edit-line" />
                            </span>
                          </button>
                          <button
                            onClick={() => setConfirmDelete(voucher)}
                            disabled={busy || !voucher.active}
                            className="text-charcoal-500 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={voucher.active ? 'Delete voucher' : 'Already inactive'}
                            aria-label={`Delete ${voucher.code}`}
                          >
                            <span className="w-5 h-5 flex items-center justify-center">
                              <i className="ri-delete-bin-line" />
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {!loading && voucherList.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-paper-400 text-2xl">
              <i className="ri-coupon-line" />
            </div>
            <p className="text-sm text-charcoal-500">
              No vouchers have been created yet.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-paper-200">
              <h3 className="font-serif text-lg font-medium text-charcoal-900">
                {editingVoucher ? 'Edit Voucher' : 'Create Voucher'}
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
                    Code
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder={editingVoucher ? 'Voucher code' : 'Auto-generate'}
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                      Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          type: e.target.value as VoucherType,
                          value:
                            e.target.value === 'free_shipping' ? '0' : prev.value,
                        }))
                      }
                      className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="free_shipping">Free Shipping</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                      Value
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, value: e.target.value }))
                      }
                      disabled={form.type === 'free_shipping'}
                      required={form.type !== 'free_shipping'}
                      className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400 disabled:text-charcoal-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                      Valid From
                    </label>
                    <input
                      type="date"
                      value={form.startsAt}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                      }
                      className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, expiresAt: e.target.value }))
                      }
                      className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.usageLimit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          usageLimit: e.target.value,
                        }))
                      }
                      placeholder="Unlimited"
                      className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                      Uses Per User
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.perUserLimit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          perUserLimit: e.target.value,
                        }))
                      }
                      placeholder="Unlimited"
                      className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 rounded border border-paper-200 bg-paper-50 p-3">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          featured: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 accent-gold-600"
                    />
                    <span>
                      <span className="block text-xs font-medium text-charcoal-800">
                        Feature on account overview
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded border border-paper-200 bg-paper-50 p-3">
                    <input
                      type="checkbox"
                      checked={form.stackable}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          stackable: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 accent-gold-600"
                    />
                    <span>
                      <span className="block text-xs font-medium text-charcoal-800">
                        Stackable
                      </span>
                    </span>
                  </label>
                </div>
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
                  {saving ? 'Saving...' : 'Save Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-5">
              <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-2">
                Delete voucher?
              </h3>
              <p className="text-sm text-charcoal-600">
                <span className="font-medium">{confirmDelete.code}</span> will be
                deactivated and hidden from customer voucher surfaces. You can
                re-activate it later from this list.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-paper-200">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={busyIds.has(confirmDelete._id)}
                className="text-sm text-charcoal-600 hover:text-charcoal-900 px-4 py-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteVoucher(confirmDelete)}
                disabled={busyIds.has(confirmDelete._id)}
                className="bg-red-600 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {busyIds.has(confirmDelete._id) ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
