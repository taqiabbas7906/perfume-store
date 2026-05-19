'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { authFetch } from '@/lib/api'
import type {
  NewsletterCampaignAudience,
  NewsletterCampaignStatus,
} from '@/types'

interface NewsletterCampaign {
  _id: string
  subject: string
  previewText: string
  content: string
  audience: NewsletterCampaignAudience
  status: NewsletterCampaignStatus
  sentAt?: string
  scheduledAt?: string
  sentCount: number
  openCount: number
  clickCount: number
  createdAt: string
  updatedAt: string
}

interface NewsletterSubscriber {
  _id: string
  email: string
  name: string
  status: 'active' | 'unsubscribed'
  subscribedAt: string
  lastOpen?: string
}

interface SubscriberCounts {
  total: number
  active: number
  unsubscribed: number
}

interface CampaignForm {
  subject: string
  previewText: string
  content: string
  audience: NewsletterCampaignAudience
}

const emptyForm: CampaignForm = {
  subject: '',
  previewText: '',
  content: '',
  audience: 'all',
}

const statusColors: Record<NewsletterCampaignStatus, string> = {
  draft: 'bg-charcoal-100 text-charcoal-700',
  scheduled: 'bg-amber-50 text-amber-700',
  sending: 'bg-gold-100 text-gold-700',
  sent: 'bg-green-50 text-green-700',
}

const statusLabels: Record<NewsletterCampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
}

const audienceLabels: Record<NewsletterCampaignAudience, string> = {
  all: 'All Subscribers',
  active: 'Active Only',
  customers: 'Past Customers',
  vip: 'VIP Members',
}

function formatNumber(n: number) {
  return n.toLocaleString()
}

function formatRate(count: number, total: number) {
  if (!total) return '0%'
  return ((count / total) * 100).toFixed(1) + '%'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 bg-paper-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

export default function NewsletterPanel() {
  const [campaignList, setCampaignList] = useState<NewsletterCampaign[]>([])
  const [subscriberList, setSubscriberList] = useState<NewsletterSubscriber[]>([])
  const [subscriberCounts, setSubscriberCounts] = useState<SubscriberCounts>({
    total: 0,
    active: 0,
    unsubscribed: 0,
  })
  const [activeTab, setActiveTab] = useState<'campaigns' | 'subscribers' | 'compose'>(
    'campaigns',
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | NewsletterCampaignStatus
  >('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  const [showCompose, setShowCompose] = useState(false)
  const [editCampaign, setEditCampaign] = useState<NewsletterCampaign | null>(null)
  const [form, setForm] = useState<CampaignForm>(emptyForm)

  /** The campaign the admin has clicked “send” on but not yet confirmed. */
  const [confirmSend, setConfirmSend] = useState<NewsletterCampaign | null>(null)
  /** Toast shown after a send finishes (success/failed counts or test result). */
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')

  const loadNewsletter = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const [campaignRes, subscriberRes] = await Promise.all([
        authFetch(`/api/admin/newsletter/campaigns?${params.toString()}`),
        authFetch('/api/admin/newsletter/subscribers'),
      ])
      const campaignData = await campaignRes.json()
      const subscriberData = await subscriberRes.json()

      if (!campaignRes.ok || !campaignData.success) {
        throw new Error(campaignData.error || 'Failed to load campaigns')
      }
      if (!subscriberRes.ok || !subscriberData.success) {
        throw new Error(subscriberData.error || 'Failed to load subscribers')
      }

      setCampaignList((campaignData.campaigns ?? []) as NewsletterCampaign[])
      setSubscriberList((subscriberData.subscribers ?? []) as NewsletterSubscriber[])
      setSubscriberCounts({
        total: subscriberData.counts?.total ?? 0,
        active: subscriberData.counts?.active ?? 0,
        unsubscribed: subscriberData.counts?.unsubscribed ?? 0,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load newsletter data',
      )
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => {
      void loadNewsletter()
    }, 250)
    return () => clearTimeout(t)
  }, [loadNewsletter])

  /**
   * Sends are queued via `after()` on the server, so a campaign sits in
   * 'sending' status until the background batch finishes. Poll every 5 s
   * while any campaign is in flight so the list updates without a manual
   * refresh.
   */
  useEffect(() => {
    const anySending = campaignList.some((c) => c.status === 'sending')
    if (!anySending) return
    const id = window.setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        void loadNewsletter(false)
      }
    }, 5000)
    return () => window.clearInterval(id)
  }, [campaignList, loadNewsletter])

  const stats = useMemo(() => {
    const sent = campaignList.filter((c) => c.status === 'sent')
    const totalSent = sent.reduce((sum, c) => sum + c.sentCount, 0)
    const totalOpen = sent.reduce((sum, c) => sum + c.openCount, 0)
    const totalClick = sent.reduce((sum, c) => sum + c.clickCount, 0)
    const openRate = totalSent ? (totalOpen / totalSent) * 100 : 0
    const clickRate = totalSent ? (totalClick / totalSent) * 100 : 0
    const engagement = Math.min(10, (openRate / 10) * 0.7 + (clickRate / 10) * 0.3)
    return {
      totalCampaigns: campaignList.length,
      sentCampaigns: sent.length,
      totalSent,
      avgOpenRate: `${openRate.toFixed(1)}%`,
      avgClickRate: `${clickRate.toFixed(1)}%`,
      subscribers: subscriberCounts.total,
      activeSubs: subscriberCounts.active,
      engagementScore: `${engagement.toFixed(1)}/10`,
    }
  }, [campaignList, subscriberCounts])

  function markBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function openCompose(campaign?: NewsletterCampaign) {
    if (campaign) {
      setEditCampaign(campaign)
      setForm({
        subject: campaign.subject,
        previewText: campaign.previewText,
        content: campaign.content,
        audience: campaign.audience,
      })
    } else {
      setEditCampaign(null)
      setForm(emptyForm)
    }
    setError('')
    setShowCompose(true)
  }

  async function saveCampaign(event?: FormEvent) {
    event?.preventDefault()
    if (!form.subject.trim() || !form.content.trim()) {
      setError('Subject and content are required')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        subject: form.subject.trim(),
        previewText: form.previewText.trim(),
        content: form.content.trim(),
        audience: form.audience,
      }
      const res = await authFetch(
        editCampaign
          ? `/api/admin/newsletter/campaigns/${editCampaign._id}`
          : '/api/admin/newsletter/campaigns',
        {
          method: editCampaign ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save campaign')
      }

      const campaign = data.campaign as NewsletterCampaign
      setCampaignList((prev) =>
        editCampaign
          ? prev.map((candidate) =>
              candidate._id === campaign._id ? campaign : candidate,
            )
          : [campaign, ...prev],
      )
      setShowCompose(false)
      setEditCampaign(null)
      setForm(emptyForm)
      setActiveTab('campaigns')
      void loadNewsletter(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCampaign(id: string) {
    markBusy(id, true)
    setError('')
    try {
      const res = await authFetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete campaign')
      }
      setCampaignList((prev) => prev.filter((campaign) => campaign._id !== id))
      void loadNewsletter(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign')
    } finally {
      markBusy(id, false)
    }
  }

  async function sendCampaign(campaign: NewsletterCampaign) {
    markBusy(campaign._id, true)
    setError('')
    setConfirmSend(null)
    try {
      const res = await authFetch(
        `/api/admin/newsletter/campaigns/${campaign._id}`,
        { method: 'POST', body: JSON.stringify({}) },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send campaign')
      }
      const updated = data.campaign as NewsletterCampaign | undefined
      if (updated) {
        setCampaignList((prev) =>
          prev.map((candidate) =>
            candidate._id === updated._id ? updated : candidate,
          ),
        )
      }
      const result = data.result as {
        sent?: number
        failed?: number
        recipients?: number
      } | undefined
      const sent = result?.sent ?? 0
      const failed = result?.failed ?? 0
      const recipients = result?.recipients ?? 0
      const queued = data.queued === true
      const kind: 'success' | 'error' =
        failed > 0 && sent === 0 ? 'error' : 'success'
      const message = queued
        ? `Queued for ${recipients} subscriber${recipients !== 1 ? 's' : ''}. The list updates automatically when it finishes sending.`
        : sent === 0 && failed === 0
          ? `Campaign queued.`
          : `Sent to ${sent} subscriber${sent !== 1 ? 's' : ''}${
              failed > 0 ? ` · ${failed} failed` : ''
            }.`
      setToast({ kind, message })
      void loadNewsletter(false)
    } catch (err) {
      setToast({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to send campaign',
      })
    } finally {
      markBusy(campaign._id, false)
    }
  }

  async function sendTest(campaign: NewsletterCampaign, email: string) {
    const target = email.trim()
    if (!target || !/\S+@\S+\.\S+/.test(target)) {
      setToast({ kind: 'error', message: 'Enter a valid test email address.' })
      return
    }
    markBusy(campaign._id, true)
    try {
      const res = await authFetch(
        `/api/admin/newsletter/campaigns/${campaign._id}?test=${encodeURIComponent(target)}`,
        { method: 'POST', body: JSON.stringify({}) },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send test email')
      }
      setToast({
        kind: 'success',
        message: `Test email sent to ${data.sentTo ?? target}.`,
      })
      setTestingId(null)
      setTestEmail('')
    } catch (err) {
      setToast({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to send test email',
      })
    } finally {
      markBusy(campaign._id, false)
    }
  }

  const maxSent = Math.max(...campaignList.map((c) => c.sentCount || 0), 1)
  const maxOpen = Math.max(...campaignList.map((c) => c.openCount || 0), 1)
  const maxClick = Math.max(...campaignList.map((c) => c.clickCount || 0), 1)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-charcoal-900">
            Newsletter
          </h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Manage email campaigns and subscribers
          </p>
        </div>
        <button
          onClick={() => openCompose()}
          className="px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line" />
          </span>
          Compose Newsletter
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total Campaigns',
            value: stats.totalCampaigns,
            icon: 'ri-mail-send-line',
            color: 'bg-gold-50 text-gold-600',
          },
          {
            label: 'Sent Campaigns',
            value: stats.sentCampaigns,
            icon: 'ri-check-double-line',
            color: 'bg-green-50 text-green-600',
          },
          {
            label: 'Total Subscribers',
            value: stats.subscribers,
            icon: 'ri-user-heart-line',
            color: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Active Subscribers',
            value: stats.activeSubs,
            icon: 'ri-shield-user-line',
            color: 'bg-purple-50 text-purple-600',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-paper-200 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-9 h-9 flex items-center justify-center rounded-lg ${s.color}`}
              >
                <i className={s.icon} />
              </span>
              <div>
                <p className="text-xs text-charcoal-500">{s.label}</p>
                <p className="text-lg font-semibold text-charcoal-900">
                  {formatNumber(s.value)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total Sent',
            value: formatNumber(stats.totalSent),
            icon: 'ri-mail-open-line',
            color: 'text-gold-600',
          },
          {
            label: 'Avg Open Rate',
            value: stats.avgOpenRate,
            icon: 'ri-eye-line',
            color: 'text-green-600',
          },
          {
            label: 'Avg Click Rate',
            value: stats.avgClickRate,
            icon: 'ri-cursor-line',
            color: 'text-blue-600',
          },
          {
            label: 'Engagement Score',
            value: stats.engagementScore,
            icon: 'ri-fire-line',
            color: 'text-amber-600',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-paper-200 p-4 flex items-center gap-3"
          >
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-lg bg-paper-50 ${s.color}`}
            >
              <i className={s.icon} />
            </span>
            <div>
              <p className="text-xs text-charcoal-500">{s.label}</p>
              <p className="text-base font-semibold text-charcoal-900">{s.value}</p>
            </div>
          </div>
        ))}
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

      <div className="flex gap-1 bg-paper-100 rounded-lg p-1 mb-6 w-fit">
        {[
          { key: 'campaigns', label: 'Campaigns' },
          { key: 'subscribers', label: 'Subscribers' },
          { key: 'compose', label: 'Quick Compose' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === (t.key as typeof activeTab)
                ? 'bg-white text-charcoal-900 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-paper-200 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-charcoal-400">
                <i className="ri-search-line" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-paper-300 text-sm focus:outline-none focus:border-gold-400 bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | NewsletterCampaignStatus)
              }
              className="px-3 py-2.5 rounded-lg border border-paper-300 text-sm focus:outline-none focus:border-gold-400 bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
            </select>
            <button
              onClick={() => void loadNewsletter()}
              disabled={loading}
              className="border border-paper-300 text-charcoal-700 text-xs uppercase tracking-wider px-4 py-2 hover:border-gold-300 hover:text-charcoal-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={loading ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} />
              </span>
              Refresh
            </button>
          </div>

          <div className="bg-white rounded-xl border border-paper-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-200 text-charcoal-500 bg-paper-50/50">
                    <th className="text-left px-4 py-3 font-medium">Campaign</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                      Audience
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">
                      Sent
                    </th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">
                      Opens
                    </th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">
                      Clicks
                    </th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                          <i className="ri-loader-4-line animate-spin" />
                          Loading newsletter campaigns...
                        </span>
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    campaignList.map((c) => {
                      const busy = busyIds.has(c._id)
                      return (
                        <tr
                          key={c._id}
                          className="border-b border-paper-100 hover:bg-paper-50/60 transition-colors"
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-charcoal-900 max-w-[260px] truncate">
                              {c.subject}
                            </div>
                            <div className="text-xs text-charcoal-400 mt-0.5 max-w-[280px] truncate">
                              {c.previewText}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell text-charcoal-600 text-xs">
                            {audienceLabels[c.audience]}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[c.status]}`}
                            >
                              {busy ? 'Working...' : statusLabels[c.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                            <div className="text-charcoal-700 text-xs font-medium">
                              {c.sentCount ? formatNumber(c.sentCount) : '-'}
                            </div>
                            {c.sentCount > 0 && (
                              <MiniBar value={c.sentCount} max={maxSent} color="#C9A96E" />
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                            {c.openCount ? (
                              <div className="space-y-1">
                                <div className="text-charcoal-700 text-xs font-medium">
                                  {formatRate(c.openCount, c.sentCount)}
                                </div>
                                <MiniBar value={c.openCount} max={maxOpen} color="#22c55e" />
                                <div className="text-[10px] text-charcoal-400">
                                  {formatNumber(c.openCount)} opened
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                            {c.clickCount ? (
                              <div className="space-y-1">
                                <div className="text-charcoal-700 text-xs font-medium">
                                  {formatRate(c.clickCount, c.sentCount)}
                                </div>
                                <MiniBar
                                  value={c.clickCount}
                                  max={maxClick}
                                  color="#3b82f6"
                                />
                                <div className="text-[10px] text-charcoal-400">
                                  {formatNumber(c.clickCount)} clicked
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell text-charcoal-500 text-xs">
                            {formatDate(c.sentAt || c.scheduledAt || c.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {c.status !== 'sent' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setTestEmail('')
                                      setTestingId(c._id)
                                    }}
                                    disabled={busy}
                                    className="w-8 h-8 flex items-center justify-center text-charcoal-500 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors disabled:opacity-40"
                                    title="Send test email"
                                  >
                                    <i className="ri-mail-line" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmSend(c)}
                                    disabled={busy}
                                    className="w-8 h-8 flex items-center justify-center text-charcoal-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
                                    title="Send to subscribers"
                                  >
                                    <i className="ri-send-plane-line" />
                                  </button>
                                </>
                              )}
                              {c.status === 'draft' && (
                                <button
                                  onClick={() => openCompose(c)}
                                  disabled={busy}
                                  className="w-8 h-8 flex items-center justify-center text-charcoal-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                                  title="Edit"
                                >
                                  <i className="ri-edit-line" />
                                </button>
                              )}
                              <button
                                onClick={() => void deleteCampaign(c._id)}
                                disabled={busy}
                                className="w-8 h-8 flex items-center justify-center text-charcoal-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  {!loading && campaignList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 rounded-full bg-paper-100 text-charcoal-300 text-xl">
                          <i className="ri-mail-close-line" />
                        </div>
                        <p className="text-sm text-charcoal-500">No campaigns found</p>
                        <p className="text-xs text-charcoal-400 mt-1">
                          Try adjusting your filters
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscribers' && (
        <div className="bg-white rounded-xl border border-paper-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper-200 text-charcoal-500 bg-paper-50/50">
                  <th className="text-left px-4 py-3 font-medium">Subscriber</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    Subscribed
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Last Open
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center">
                      <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                        <i className="ri-loader-4-line animate-spin" />
                        Loading subscribers...
                      </span>
                    </td>
                  </tr>
                )}
                {!loading &&
                  subscriberList.map((s) => (
                    <tr key={s._id} className="border-b border-paper-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-charcoal-900">{s.name}</p>
                        <p className="text-xs text-charcoal-400">{s.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-medium ${
                            s.status === 'active'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-charcoal-600 text-xs">
                        {formatDate(s.subscribedAt)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-charcoal-600 text-xs">
                        {formatDate(s.lastOpen)}
                      </td>
                    </tr>
                  ))}
                {!loading && subscriberList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center">
                      <p className="text-sm text-charcoal-500">No subscribers found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'compose' && (
        <div className="bg-white rounded-xl border border-paper-200 p-6">
          <h3 className="font-serif text-lg font-medium text-charcoal-900 mb-4">
            Quick Compose
          </h3>
          <form onSubmit={saveCampaign} className="space-y-4 max-w-2xl">
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Enter campaign subject..."
                className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                Preview Text
              </label>
              <input
                type="text"
                value={form.previewText}
                onChange={(e) => setForm({ ...form, previewText: e.target.value })}
                className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                Audience
              </label>
              <select
                value={form.audience}
                onChange={(e) =>
                  setForm({
                    ...form,
                    audience: e.target.value as NewsletterCampaignAudience,
                  })
                }
                className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
              >
                <option value="all">All Subscribers</option>
                <option value="active">Active Only</option>
                <option value="customers">Past Customers</option>
                <option value="vip">VIP Members</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                Content (HTML)
              </label>
              <textarea
                rows={8}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400 font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-paper-200">
              <h3 className="font-serif text-lg font-medium text-charcoal-900">
                {editCampaign ? 'Edit Campaign' : 'New Campaign'}
              </h3>
              <button
                onClick={() => setShowCompose(false)}
                disabled={saving}
                className="text-charcoal-400 hover:text-charcoal-700 transition-colors disabled:opacity-50"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-close-line" />
                </span>
              </button>
            </div>
            <form onSubmit={saveCampaign}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                    Preview Text
                  </label>
                  <input
                    type="text"
                    value={form.previewText}
                    onChange={(e) =>
                      setForm({ ...form, previewText: e.target.value })
                    }
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                    Audience
                  </label>
                  <select
                    value={form.audience}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        audience: e.target.value as NewsletterCampaignAudience,
                      })
                    }
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                  >
                    <option value="all">All Subscribers</option>
                    <option value="active">Active Only</option>
                    <option value="customers">Past Customers</option>
                    <option value="vip">VIP Members</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                    Content (HTML)
                  </label>
                  <textarea
                    rows={8}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400 font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-paper-200">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
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
                  {saving ? 'Saving...' : 'Save Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send-to-subscribers confirmation */}
      {confirmSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-5 border-b border-paper-200">
              <h3 className="font-serif text-lg font-medium text-charcoal-900">
                Send this campaign?
              </h3>
            </div>
            <div className="p-5 space-y-3 text-sm text-charcoal-700">
              <p>
                <span className="font-medium text-charcoal-900">
                  {confirmSend.subject}
                </span>{' '}
                will be delivered to <span className="font-medium">{audienceLabels[confirmSend.audience]}</span> via Resend.
              </p>
              <p className="text-xs text-charcoal-500">
                This action cannot be undone. Once the campaign is sent it will be marked
                as “Sent” and locked from further edits. Use the test envelope icon to
                preview it in your own inbox first.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-paper-200">
              <button
                onClick={() => setConfirmSend(null)}
                disabled={busyIds.has(confirmSend._id)}
                className="text-sm text-charcoal-600 hover:text-charcoal-900 px-4 py-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void sendCampaign(confirmSend)}
                disabled={busyIds.has(confirmSend._id)}
                className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {busyIds.has(confirmSend._id) ? (
                  <>
                    <i className="ri-loader-4-line animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-line" />
                    Send via Resend
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test-send modal */}
      {testingId &&
        (() => {
          const target = campaignList.find((c) => c._id === testingId)
          if (!target) return null
          const busy = busyIds.has(target._id)
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void sendTest(target, testEmail)
                }}
                className="bg-white rounded-lg w-full max-w-md"
              >
                <div className="p-5 border-b border-paper-200">
                  <h3 className="font-serif text-lg font-medium text-charcoal-900">
                    Send test email
                  </h3>
                  <p className="text-xs text-charcoal-500 mt-1">
                    Preview “{target.subject}” by sending it to one address.
                  </p>
                </div>
                <div className="p-5">
                  <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                    Recipient
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 p-5 border-t border-paper-200">
                  <button
                    type="button"
                    onClick={() => {
                      setTestingId(null)
                      setTestEmail('')
                    }}
                    disabled={busy}
                    className="text-sm text-charcoal-600 hover:text-charcoal-900 px-4 py-2 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !testEmail.trim()}
                    className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {busy ? (
                      <>
                        <i className="ri-loader-4-line animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <i className="ri-mail-send-line" />
                        Send test
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )
        })()}

      {/* Result toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] max-w-sm">
          <div
            className={`rounded-lg shadow-lg border px-4 py-3 text-sm flex items-start gap-3 ${
              toast.kind === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <i
              className={`text-base mt-0.5 ${
                toast.kind === 'success' ? 'ri-check-line' : 'ri-error-warning-line'
              }`}
            />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-current/60 hover:text-current text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
