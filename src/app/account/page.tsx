'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/api'
import { logout } from '@/lib/logout'
import { Avatar } from '@/components/Avatar'

/* ─────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────── */
interface UserProfile {
  _id: string
  name: string
  email: string
  phone?: string
  role: string
  hasPassword: boolean
  emailVerified?: string
  createdAt: string
}

type Tab = 'profile' | 'security' | 'danger'

/* ─────────────────────────────────────────────────────────────
 * Shared design tokens (matches login page aesthetic)
 * ───────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .acc-root {
    min-height: 100vh;
    background: #0a0a0a;
    font-family: 'Jost', sans-serif;
    color: #f5ead8;
  }

  /* ── Header bar ── */
  .acc-header {
    background: #0f0f0f;
    border-bottom: 1px solid rgba(201,169,110,0.12);
    padding: 0 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
  }
  .acc-header-brand {
    font-family: 'Cormorant Garamond', serif;
    font-size: 20px;
    font-weight: 300;
    letter-spacing: 0.2em;
    color: #c9a96e;
    text-transform: uppercase;
    text-decoration: none;
  }
  .acc-header-back {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(245,234,216,0.4);
    font-size: 12px;
    letter-spacing: 0.08em;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Jost', sans-serif;
    text-decoration: none;
    transition: color 0.2s;
  }
  .acc-header-back:hover { color: #c9a96e; }

  /* ── Layout ── */
  .acc-layout {
    max-width: 1100px;
    margin: 0 auto;
    padding: 48px 24px;
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 32px;
  }
  @media (max-width: 768px) {
    .acc-layout { grid-template-columns: 1fr; padding: 24px 16px; }
    .acc-header { padding: 0 16px; }
  }

  /* ── Sidebar ── */
  .acc-sidebar {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .acc-sidebar-avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 0 28px;
    border-bottom: 1px solid rgba(201,169,110,0.1);
    margin-bottom: 8px;
  }
  .acc-avatar-wrap {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    margin-bottom: 12px;
    cursor: pointer;
  }
  .acc-avatar-img {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(201,169,110,0.3);
  }
  .acc-avatar-placeholder {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(201,169,110,0.2), rgba(139,90,60,0.2));
    border: 2px solid rgba(201,169,110,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cormorant Garamond', serif;
    font-size: 26px;
    font-weight: 300;
    color: #c9a96e;
  }
  .acc-avatar-overlay {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(0,0,0,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    font-size: 11px;
    letter-spacing: 0.06em;
    color: #f5ead8;
    flex-direction: column;
    gap: 4px;
  }
  .acc-avatar-wrap:hover .acc-avatar-overlay { opacity: 1; }
  .acc-sidebar-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    font-weight: 400;
    color: #f5ead8;
    text-align: center;
    margin-bottom: 4px;
  }
  .acc-sidebar-email {
    font-size: 11px;
    color: rgba(245,234,216,0.35);
    letter-spacing: 0.04em;
    text-align: center;
  }
  .acc-sidebar-role {
    margin-top: 6px;
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #c9a96e;
    background: rgba(201,169,110,0.1);
    border: 1px solid rgba(201,169,110,0.2);
    border-radius: 20px;
    padding: 2px 10px;
  }

  .acc-nav-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: rgba(245,234,216,0.45);
    font-family: 'Jost', sans-serif;
    font-size: 13px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
  }
  .acc-nav-btn:hover {
    background: rgba(201,169,110,0.06);
    color: rgba(245,234,216,0.75);
  }
  .acc-nav-btn.active {
    background: rgba(201,169,110,0.1);
    color: #c9a96e;
    border: 1px solid rgba(201,169,110,0.15);
  }
  .acc-nav-btn.danger { color: rgba(248,113,113,0.5); }
  .acc-nav-btn.danger:hover { background: rgba(220,38,38,0.06); color: rgba(248,113,113,0.8); }
  .acc-nav-btn.danger.active { background: rgba(220,38,38,0.08); color: #f87171; border-color: rgba(220,38,38,0.2); }
  .acc-nav-icon { font-size: 15px; flex-shrink: 0; }
  .acc-nav-divider {
    height: 1px;
    background: rgba(201,169,110,0.08);
    margin: 8px 0;
  }

  /* ── Content panel ── */
  .acc-panel {
    background: #0f0f0f;
    border: 1px solid rgba(201,169,110,0.1);
    border-radius: 12px;
    padding: 36px;
  }
  @media (max-width: 768px) { .acc-panel { padding: 24px 20px; } }

  .acc-panel-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px;
    font-weight: 300;
    color: #f5ead8;
    margin: 0 0 6px;
    letter-spacing: -0.01em;
  }
  .acc-panel-subtitle {
    font-size: 12px;
    color: rgba(245,234,216,0.35);
    letter-spacing: 0.04em;
    margin: 0 0 32px;
  }
  .acc-panel-divider {
    height: 1px;
    background: rgba(201,169,110,0.08);
    margin: 28px 0;
  }

  /* ── Form fields ── */
  .acc-field {
    margin-bottom: 18px;
  }
  .acc-field label {
    display: block;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(245,234,216,0.4);
    margin-bottom: 8px;
    font-weight: 400;
  }
  .acc-field input, .acc-field select {
    width: 100%;
    padding: 11px 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(201,169,110,0.15);
    border-radius: 8px;
    color: #f5ead8;
    font-family: 'Jost', sans-serif;
    font-size: 14px;
    font-weight: 300;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
  }
  .acc-field input::placeholder { color: rgba(245,234,216,0.2); }
  .acc-field input:focus, .acc-field select:focus {
    border-color: rgba(201,169,110,0.4);
    background: rgba(201,169,110,0.03);
  }
  .acc-field input:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .acc-field select option { background: #1a1a1a; }

  .acc-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 600px) { .acc-field-row { grid-template-columns: 1fr; } }

  /* ── Buttons ── */
  .acc-btn-primary {
    padding: 11px 28px;
    background: linear-gradient(135deg, #c9a96e 0%, #a07840 100%);
    border: none;
    border-radius: 8px;
    color: #0a0a0a;
    font-family: 'Jost', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }
  .acc-btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .acc-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .acc-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  .acc-btn-ghost {
    padding: 11px 20px;
    background: transparent;
    border: 1px solid rgba(201,169,110,0.2);
    border-radius: 8px;
    color: rgba(245,234,216,0.55);
    font-family: 'Jost', sans-serif;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }
  .acc-btn-ghost:hover:not(:disabled) {
    border-color: rgba(201,169,110,0.4);
    color: #c9a96e;
    background: rgba(201,169,110,0.04);
  }
  .acc-btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }

  .acc-btn-danger {
    padding: 11px 24px;
    background: transparent;
    border: 1px solid rgba(220,38,38,0.3);
    border-radius: 8px;
    color: #f87171;
    font-family: 'Jost', sans-serif;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }
  .acc-btn-danger:hover:not(:disabled) {
    background: rgba(220,38,38,0.08);
    border-color: rgba(220,38,38,0.5);
  }
  .acc-btn-danger-solid {
    padding: 11px 24px;
    background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-family: 'Jost', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .acc-btn-danger-solid:hover:not(:disabled) { opacity: 0.88; }
  .acc-btn-danger-solid:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Alerts ── */
  .acc-alert {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 300;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .acc-alert.success {
    background: rgba(34,197,94,0.08);
    border: 1px solid rgba(34,197,94,0.2);
    color: #86efac;
  }
  .acc-alert.error {
    background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.2);
    color: #fca5a5;
  }
  .acc-alert.warn {
    background: rgba(234,179,8,0.08);
    border: 1px solid rgba(234,179,8,0.2);
    color: #fde047;
  }
  .acc-alert.info {
    background: rgba(201,169,110,0.08);
    border: 1px solid rgba(201,169,110,0.2);
    color: #c9a96e;
  }

  /* ── Avatar upload area ── */
  .acc-avatar-upload {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: rgba(255,255,255,0.02);
    border: 1px dashed rgba(201,169,110,0.2);
    border-radius: 10px;
    margin-bottom: 24px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .acc-avatar-upload:hover {
    border-color: rgba(201,169,110,0.4);
    background: rgba(201,169,110,0.03);
  }
  .acc-avatar-upload-img {
    width: 56px; height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(201,169,110,0.3);
    flex-shrink: 0;
  }
  .acc-avatar-upload-placeholder {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: rgba(201,169,110,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px;
    color: #c9a96e;
    flex-shrink: 0;
  }
  .acc-avatar-upload-text strong {
    display: block;
    font-size: 13px;
    font-weight: 400;
    color: rgba(245,234,216,0.7);
    margin-bottom: 3px;
  }
  .acc-avatar-upload-text span {
    font-size: 11px;
    color: rgba(245,234,216,0.3);
    letter-spacing: 0.04em;
  }

  /* ── Address cards ── */
  .acc-addr-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .acc-addr-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(201,169,110,0.1);
    border-radius: 10px;
    padding: 18px;
    position: relative;
    transition: border-color 0.2s;
  }
  .acc-addr-card.default {
    border-color: rgba(201,169,110,0.35);
    background: rgba(201,169,110,0.04);
  }
  .acc-addr-card:hover { border-color: rgba(201,169,110,0.25); }
  .acc-addr-default-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #c9a96e;
    background: rgba(201,169,110,0.12);
    border: 1px solid rgba(201,169,110,0.25);
    border-radius: 20px;
    padding: 2px 8px;
  }
  .acc-addr-label {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(245,234,216,0.4);
    margin-bottom: 6px;
  }
  .acc-addr-name {
    font-size: 14px;
    font-weight: 400;
    color: #f5ead8;
    margin-bottom: 6px;
  }
  .acc-addr-lines {
    font-size: 12px;
    font-weight: 300;
    color: rgba(245,234,216,0.45);
    line-height: 1.6;
    margin-bottom: 14px;
  }
  .acc-addr-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .acc-addr-action-btn {
    font-size: 11px;
    letter-spacing: 0.06em;
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid rgba(201,169,110,0.15);
    background: transparent;
    color: rgba(245,234,216,0.4);
    cursor: pointer;
    font-family: 'Jost', sans-serif;
    transition: all 0.2s;
  }
  .acc-addr-action-btn:hover {
    border-color: rgba(201,169,110,0.35);
    color: #c9a96e;
    background: rgba(201,169,110,0.05);
  }
  .acc-addr-action-btn.del:hover {
    border-color: rgba(220,38,38,0.3);
    color: #f87171;
    background: rgba(220,38,38,0.05);
  }
  .acc-addr-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* ── Address form modal ── */
  .acc-modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .acc-modal {
    background: #131313;
    border: 1px solid rgba(201,169,110,0.15);
    border-radius: 14px;
    padding: 32px;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
  }
  .acc-modal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px;
    font-weight: 300;
    color: #f5ead8;
    margin: 0 0 24px;
  }
  .acc-modal-close {
    position: absolute;
    top: 20px; right: 20px;
    background: none; border: none;
    color: rgba(245,234,216,0.3);
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    transition: color 0.2s;
    padding: 4px;
  }
  .acc-modal-close:hover { color: #c9a96e; }

  .acc-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid rgba(201,169,110,0.08);
  }

  /* ── Checkbox ── */
  .acc-checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    cursor: pointer;
    user-select: none;
  }
  .acc-checkbox-row input[type='checkbox'] {
    width: 16px; height: 16px;
    accent-color: #c9a96e;
    cursor: pointer;
    flex-shrink: 0;
  }
  .acc-checkbox-label {
    font-size: 13px;
    font-weight: 300;
    color: rgba(245,234,216,0.6);
    line-height: 1.4;
  }

  /* ── Section headings ── */
  .acc-section-heading {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(201,169,110,0.6);
    margin-bottom: 18px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(201,169,110,0.08);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── Loading spinner ── */
  @keyframes spin { to { transform: rotate(360deg); } }
  .acc-spinner {
    width: 20px; height: 20px;
    border: 2px solid rgba(201,169,110,0.2);
    border-top-color: #c9a96e;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  /* ── Danger zone ── */
  .acc-danger-zone {
    border: 1px solid rgba(220,38,38,0.2);
    border-radius: 10px;
    padding: 24px;
    background: rgba(220,38,38,0.03);
  }
  .acc-danger-zone h3 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 20px;
    font-weight: 400;
    color: #f87171;
    margin: 0 0 8px;
  }
  .acc-danger-zone p {
    font-size: 13px;
    font-weight: 300;
    color: rgba(245,234,216,0.4);
    line-height: 1.6;
    margin: 0 0 20px;
  }

  /* ── Security info card ── */
  .acc-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid rgba(201,169,110,0.06);
  }
  .acc-info-row:last-child { border-bottom: none; }
  .acc-info-label {
    font-size: 12px;
    font-weight: 300;
    color: rgba(245,234,216,0.4);
    letter-spacing: 0.04em;
  }
  .acc-info-value {
    font-size: 13px;
    font-weight: 400;
    color: rgba(245,234,216,0.7);
  }
  .acc-badge {
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-radius: 20px;
    padding: 2px 10px;
    font-weight: 400;
  }
  .acc-badge.green {
    color: #86efac;
    background: rgba(34,197,94,0.1);
    border: 1px solid rgba(34,197,94,0.2);
  }
  .acc-badge.amber {
    color: #c9a96e;
    background: rgba(201,169,110,0.1);
    border: 1px solid rgba(201,169,110,0.2);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in { animation: fadeIn 0.3s ease both; }
`

/* ═══════════════════════════════════════════════════════════════
 * Main Page Component
 * ═══════════════════════════════════════════════════════════════ */
export default function AccountPage() {
  const { user: firebaseUser, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tab, setTab]               = useState<Tab>('profile')
  const [profile, setProfile]       = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  /* Redirect if not logged in */
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  /* Load profile */
  useEffect(() => {
    if (!firebaseUser) return
    setProfileLoading(true)
    authFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.success) setProfile(d.user) })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [firebaseUser])

  if (authLoading || (!firebaseUser && !authLoading)) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="acc-spinner" />
      </div>
    )
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="acc-root">

        {/* ── Header ── */}
        <header className="acc-header">
          <a href="/" className="acc-header-brand">Scentara</a>
          <a href="/" className="acc-header-back">← Back to shop</a>
        </header>

        <div className="acc-layout">

          {/* ── Sidebar ── */}
          <aside className="acc-sidebar">
            <div className="acc-sidebar-avatar">
              <Avatar name={profile?.name} size={72} />
              <div className="acc-sidebar-name" style={{ marginTop: 12 }}>{profile?.name ?? '—'}</div>
              <div className="acc-sidebar-email">{profile?.email ?? ''}</div>
              {profile?.role === 'admin' && (
                <span className="acc-sidebar-role">Admin</span>
              )}
            </div>

            <button className={`acc-nav-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
              <span className="acc-nav-icon">👤</span> Profile
            </button>
            <button className={`acc-nav-btn ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>
              <span className="acc-nav-icon">🔒</span> Security
            </button>
            <Link href="/account/orders" className="acc-nav-btn" style={{ textDecoration: 'none' }}>
              <span className="acc-nav-icon">📦</span> Orders
            </Link>

            <div className="acc-nav-divider" />

            <button className="acc-nav-btn" onClick={logout} style={{ color: 'rgba(245,234,216,0.35)' }}>
              <span className="acc-nav-icon">↩</span> Sign out
            </button>

            <button className={`acc-nav-btn danger ${tab === 'danger' ? 'active' : ''}`} onClick={() => setTab('danger')}>
              <span className="acc-nav-icon">⚠️</span> Delete account
            </button>
          </aside>

          {/* ── Content ── */}
          <main>
            {tab === 'profile' && (
              <ProfilePanel
                profile={profile}
                loading={profileLoading}
                onProfileUpdate={setProfile}
              />
            )}
            {tab === 'security'  && <SecurityPanel profile={profile} />}
            {tab === 'danger'    && <DangerPanel />}
          </main>

        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
 * Profile Panel
 * ═══════════════════════════════════════════════════════════════ */
function ProfilePanel({
  profile, loading, onProfileUpdate,
}: {
  profile: UserProfile | null
  loading: boolean
  onProfileUpdate: (p: UserProfile) => void
}) {
  const [name, setName]             = useState('')
  const [saving, setSaving]         = useState(false)
  const [alert, setAlert]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
    }
  }, [profile])

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 5000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setAlert(null)
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        onProfileUpdate(data.user)
        showAlert('success', 'Profile saved successfully.')
      } else {
        showAlert('error', data.error || Object.values(data.errors ?? {})[0] as string || 'Save failed.')
      }
    } catch {
      showAlert('error', 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="acc-panel fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="acc-spinner" />
    </div>
  )

  return (
    <div className="acc-panel fade-in">
      <h2 className="acc-panel-title">Profile</h2>
      <p className="acc-panel-subtitle">Manage your personal information</p>

      {alert && (
        <div className={`acc-alert ${alert.type}`}>
          <span>{alert.type === 'success' ? '✓' : '✕'}</span>
          {alert.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0 24px', borderBottom: '1px solid rgba(201,169,110,0.08)', marginBottom: 24 }}>
        <Avatar name={profile?.name} size={64} />
        <div style={{ fontSize: 12, color: 'rgba(245,234,216,0.4)', lineHeight: 1.6 }}>
          Your profile badge is generated from your name. Update the name field below
          and your avatar updates with it.
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="acc-section-heading">Personal details</div>

        <div className="acc-field">
          <label>Full name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        <div className="acc-field">
          <label>Email address</label>
          <input type="email" value={profile?.email ?? ''} disabled />
        </div>

        <div className="acc-panel-divider" />

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="acc-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            className="acc-btn-ghost"
            onClick={() => { setName(profile?.name ?? '') }}
            disabled={saving}
          >
            Reset
          </button>
        </div>

        <div className="acc-panel-divider" />
        <div className="acc-section-heading">Account info</div>
        <div className="acc-info-row">
          <span className="acc-info-label">Member since</span>
          <span className="acc-info-value">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
        </div>
        <div className="acc-info-row">
          <span className="acc-info-label">Account role</span>
          <span className="acc-badge amber">{profile?.role ?? 'user'}</span>
        </div>
        <div className="acc-info-row">
          <span className="acc-info-label">Email status</span>
          <span className={`acc-badge ${profile?.emailVerified ? 'green' : 'amber'}`}>
            {profile?.emailVerified ? 'Verified' : 'Unverified'}
          </span>
        </div>
      </form>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
 * Security Panel
 * ═══════════════════════════════════════════════════════════════ */
function SecurityPanel({ profile }: { profile: UserProfile | null }) {
  const [current, setCurrent]   = useState('')
  const [newPass, setNewPass]   = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [alert, setAlert]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 6000)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPass !== confirm) { showAlert('error', 'New passwords do not match.'); return }
    if (newPass.length < 8) { showAlert('error', 'Password must be at least 8 characters.'); return }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPass)) {
      showAlert('error', 'Password must include uppercase, lowercase, and a number.')
      return
    }

    setSaving(true)
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          hasPassword: profile?.hasPassword ?? false,
          currentPassword: current || undefined,
          newPassword: newPass,
          confirmPassword: confirm,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrent(''); setNewPass(''); setConfirm('')
        showAlert('success', 'Password changed successfully.')
      } else {
        showAlert('error', data.error || Object.values(data.errors ?? {})[0] as string || 'Failed to change password.')
      }
    } catch {
      showAlert('error', 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="acc-panel fade-in">
      <h2 className="acc-panel-title">Security</h2>
      <p className="acc-panel-subtitle">Manage your password and account security</p>

      {alert && (
        <div className={`acc-alert ${alert.type}`}>
          <span>{alert.type === 'success' ? '✓' : '✕'}</span>
          {alert.msg}
        </div>
      )}

      <div className="acc-section-heading">Account security overview</div>
      <div className="acc-info-row">
        <span className="acc-info-label">Password set</span>
        <span className={`acc-badge ${profile?.hasPassword ? 'green' : 'amber'}`}>
          {profile?.hasPassword ? 'Yes' : 'Not set'}
        </span>
      </div>
      <div className="acc-info-row">
        <span className="acc-info-label">Sign-in methods</span>
        <span className="acc-info-value" style={{ fontSize: 12 }}>
          {profile?.hasPassword ? 'Email + social' : 'Social only'}
        </span>
      </div>

      <div className="acc-panel-divider" />
      <div className="acc-section-heading">
        {profile?.hasPassword ? 'Change password' : 'Set a password'}
      </div>

      {!profile?.hasPassword && (
        <div className="acc-alert info" style={{ marginBottom: 20 }}>
          <span>ℹ</span> You signed up via social login. You can set a password to also enable email sign-in.
        </div>
      )}

      <form onSubmit={handleChangePassword}>
        {profile?.hasPassword && (
          <div className="acc-field">
            <label>Current password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="••••••••"
              required={profile?.hasPassword}
              autoComplete="current-password"
            />
          </div>
        )}

        <div className="acc-field">
          <label>New password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="Min. 8 chars with upper, lower & number"
            required
            autoComplete="new-password"
          />
        </div>

        <div className="acc-field">
          <label>Confirm new password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            required
            autoComplete="new-password"
          />
        </div>

        <label className="acc-checkbox-row" style={{ marginBottom: 24 }}>
          <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} />
          <span className="acc-checkbox-label">Show passwords</span>
        </label>

        <button type="submit" className="acc-btn-primary" disabled={saving}>
          {saving ? 'Updating…' : profile?.hasPassword ? 'Update password' : 'Set password'}
        </button>
      </form>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
 * Danger Zone Panel
 * ═══════════════════════════════════════════════════════════════ */
function DangerPanel() {
  const [step, setStep]       = useState<1 | 2>(1)
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [alert, setAlert]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const router = useRouter()

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirm !== 'DELETE') {
      setAlert({ type: 'error', msg: 'Type DELETE exactly to confirm.' })
      return
    }
    setDeleting(true)
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: 'DELETE' }),
      })
      const data = await res.json()
      if (data.success) {
        await logout()
        router.push('/')
      } else {
        setAlert({ type: 'error', msg: data.error || 'Deletion failed. Please try again.' })
      }
    } catch {
      setAlert({ type: 'error', msg: 'Network error. Please try again.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="acc-panel fade-in">
      <h2 className="acc-panel-title" style={{ color: '#f87171' }}>Delete account</h2>
      <p className="acc-panel-subtitle">Permanently remove your account and all personal data</p>

      <div className="acc-alert warn" style={{ marginBottom: 28 }}>
        <span>⚠</span>
        This action is <strong>permanent and irreversible</strong>. Once deleted, your data cannot be recovered.
      </div>

      <div className="acc-danger-zone">
        <h3>What will be deleted</h3>
        <p>
          Your profile and personal information will be permanently anonymised.
          Your addresses will be deleted. Your cart will be cleared.
          Order history is retained for financial record-keeping with your identity removed (GDPR compliant).
        </p>

        {step === 1 && (
          <button className="acc-btn-danger" onClick={() => setStep(2)}>
            I understand, continue
          </button>
        )}

        {step === 2 && (
          <form onSubmit={handleDelete}>
            {alert && (
              <div className={`acc-alert ${alert.type}`} style={{ marginBottom: 16 }}>
                <span>{alert.type === 'success' ? '✓' : '✕'}</span>
                {alert.msg}
              </div>
            )}

            <div className="acc-field" style={{ marginBottom: 20 }}>
              <label>
                Type <strong style={{ color: '#f87171', fontFamily: 'monospace', letterSpacing: 2, fontSize: 13 }}>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                style={{ borderColor: confirm === 'DELETE' ? 'rgba(220,38,38,0.5)' : undefined }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                className="acc-btn-danger-solid"
                disabled={deleting || confirm !== 'DELETE'}
              >
                {deleting ? 'Deleting…' : 'Permanently delete my account'}
              </button>
              <button
                type="button"
                className="acc-btn-ghost"
                onClick={() => { setStep(1); setConfirm(''); setAlert(null) }}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
