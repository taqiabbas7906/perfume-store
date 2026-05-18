'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { AdminTableSkeleton } from '@/components/ui/Skeleton'

type Tab = 'categories' | 'brands' | 'collections' | 'upload'

interface Item { _id: string; name: string; slug: string; active: boolean; [k: string]: unknown }

const API: Record<Tab, string> = {
  categories:  '/api/admin/categories',
  brands:      '/api/admin/brands',
  collections: '/api/admin/collections',
  upload:      '/api/admin/upload',
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 99,
      background: active ? '#d1fae5' : '#f3f4f6',
      color: active ? '#065f46' : '#6b7280', fontWeight: 500,
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function AdminCatalogPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<Tab>('categories')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFolder, setUploadFolder] = useState('products')
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    authFetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user?.role === 'admin') setIsAdmin(true)
      else router.push('/')
    }).catch(() => router.push('/'))
  }, [user, authLoading, router])

  const fetchItems = useCallback(async () => {
    if (tab === 'upload') return
    setLoading(true)
    setError('')
    try {
      const res = await authFetch(API[tab])
      const data = await res.json()
      setItems(data[tab] ?? [])
    } catch { setError('Failed to load') }
    finally { setLoading(false) }
  }, [tab])

  useEffect(() => { if (isAdmin) fetchItems() }, [isAdmin, fetchItems])

  const defaultForm: Record<Tab, Record<string, unknown>> = {
    categories:  { name: '', slug: '', description: '', active: true, sortOrder: 0 },
    brands:      { name: '', slug: '', description: '', country: '', isLuxury: false, active: true, sortOrder: 0 },
    collections: { name: '', slug: '', description: '', isLimitedEdition: false, active: true, sortOrder: 0 },
    upload:      {},
  }

  const openCreate = () => {
    setEditId(null)
    setForm(defaultForm[tab])
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEdit = (item: Item) => {
    setEditId(item._id)
    setForm({ ...item })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const url  = editId ? `${API[tab]}/${editId}` : API[tab]
      const method = editId ? 'PATCH' : 'POST'
      const res  = await authFetch(url, { method, body: JSON.stringify(form) })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? 'Failed'); return }
      setSuccess(editId ? 'Updated!' : 'Created!')
      setShowForm(false)
      fetchItems()
    } catch { setError('Request failed') }
  }

  const toggleActive = async (item: Item) => {
    try {
      await authFetch(`${API[tab]}/${item._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      })
      fetchItems()
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return
    try {
      await authFetch(`${API[tab]}/${id}`, { method: 'DELETE' })
      fetchItems()
    } catch { setError('Delete failed') }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    setError('')
    setUploadResult(null)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('folder', uploadFolder)
      const token = await (await authFetch('/api/auth/me')).json()
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${(window as any).__firebaseToken ?? ''}` },
        body: fd,
      })
      // Use authFetch-style but with FormData (can't set Content-Type manually with multipart)
      const text = await res.text()
      const data = JSON.parse(text)
      if (data.success) setUploadResult(data.url)
      else setError(data.error)
    } catch (err) {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const f = (key: string, val: unknown) => setForm(prev => ({ ...prev, [key]: val }))

  if (authLoading || !isAdmin || loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <AdminTableSkeleton rows={6} />
      </div>
    )
  }

  const tabs: Tab[] = ['categories', 'brands', 'collections', 'upload']

  const tabStyle = (t: Tab) => ({
    padding: '8px 20px',
    background: tab === t ? '#111827' : 'transparent',
    color: tab === t ? '#fff' : '#6b7280',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    textTransform: 'capitalize' as const,
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Catalog Manager</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Categories · Brands · Collections · Image Upload</p>
        </div>
        <a href="/admin" style={{ fontSize: 13, color: '#6b7280' }}>← Dashboard</a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f9fafb', padding: 4, borderRadius: 10, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => { setTab(t); setShowForm(false); setError(''); setSuccess('') }}>
            {t}
          </button>
        ))}
      </div>

      {error   && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {/* ── UPLOAD TAB ── */}
      {tab === 'upload' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600 }}>Upload Image to Cloudinary</h2>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>FOLDER</label>
              <select value={uploadFolder} onChange={e => setUploadFolder(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}>
                {['products', 'brands', 'categories', 'collections'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>IMAGE FILE (max 8 MB)</label>
              <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                style={{ width: '100%', padding: '8px 0', fontSize: 14 }} />
            </div>
            <button type="submit" disabled={!uploadFile || uploading}
              style={{ padding: '12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!uploadFile || uploading) ? 0.5 : 1 }}>
              {uploading ? 'Uploading…' : 'Upload Image'}
            </button>
          </form>
          {uploadResult && (
            <div style={{ marginTop: 20, padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#16a34a' }}>✓ Uploaded successfully</p>
              <input readOnly value={uploadResult} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1fae5', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }} />
              <img src={uploadResult} alt="uploaded" style={{ marginTop: 12, maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
            </div>
          )}
        </div>
      )}

      {/* ── LIST TABS ── */}
      {tab !== 'upload' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={openCreate}
              style={{ padding: '8px 18px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + New {tab.slice(0, -1)}
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>
                {editId ? 'Edit' : 'Create'} {tab.slice(0, -1)}
              </h3>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {Object.entries(form).filter(([k]) => !['_id', '__v', 'createdAt', 'updatedAt', 'products'].includes(k)).map(([key, val]) => {
                  const label = <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key}</label>
                  if (typeof val === 'boolean') {
                    return (
                      <div key={key}>
                        {label}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}>
                          <input type="checkbox" checked={Boolean(val)} onChange={e => f(key, e.target.checked)} />
                          <span style={{ fontSize: 13 }}>{val ? 'Yes' : 'No'}</span>
                        </label>
                      </div>
                    )
                  }
                  if (typeof val === 'number') {
                    return (
                      <div key={key}>
                        {label}
                        <input type="number" value={val as number} onChange={e => f(key, Number(e.target.value))}
                          style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
                      </div>
                    )
                  }
                  return (
                    <div key={key} style={key === 'description' ? { gridColumn: '1 / -1' } : {}}>
                      {label}
                      {key === 'description'
                        ? <textarea value={String(val ?? '')} onChange={e => f(key, e.target.value)} rows={3}
                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
                        : <input value={String(val ?? '')} onChange={e => f(key, e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
                      }
                    </div>
                  )
                })}
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                  <button type="submit"
                    style={{ padding: '10px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {editId ? 'Save Changes' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table */}
          {loading
            ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Loading…</p>
            : items.length === 0
              ? <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12, color: '#9ca3af' }}>
                  <p style={{ margin: 0, fontSize: 14 }}>No {tab} yet</p>
                </div>
              : (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Slug</th>
                        {tab === 'brands' && <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Luxury</th>}
                        {tab === 'collections' && <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Limited</th>}
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Status</th>
                        <th style={{ padding: '12px 16px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.name}</td>
                          <td style={{ padding: '12px 16px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>{item.slug}</td>
                          {tab === 'brands' && <td style={{ padding: '12px 16px' }}>{item.isLuxury ? '✓' : '—'}</td>}
                          {tab === 'collections' && <td style={{ padding: '12px 16px' }}>{item.isLimitedEdition ? '✓' : '—'}</td>}
                          <td style={{ padding: '12px 16px' }}>
                            <button onClick={() => toggleActive(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              <StatusBadge active={item.active} />
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button onClick={() => openEdit(item)} style={{ marginRight: 8, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                            <button onClick={() => handleDelete(item._id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          }
        </>
      )}
    </div>
  )
}
