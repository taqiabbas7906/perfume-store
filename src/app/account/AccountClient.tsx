'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { smartFetch } from '@/lib/api'
import { logout } from '@/lib/logout'
import AccountOverview from '@/components/sections/account/AccountOverview'
import AccountOrders from '@/components/sections/account/AccountOrders'
import AccountWishlist from '@/components/sections/account/AccountWishlist'
import AccountSettings from '@/components/sections/account/AccountSettings'
import { AccountShellSkeleton } from '@/components/ui/Skeleton'

interface MeUser {
  _id: string
  name?: string
  email?: string
  phone?: string
  role?: string
  hasPassword?: boolean
  createdAt?: string
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line' },
  { id: 'orders', label: 'My Orders', icon: 'ri-shopping-bag-3-line' },
  { id: 'wishlist', label: 'Wishlist', icon: 'ri-heart-line' },
  { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line' },
] as const

type TabId = (typeof tabs)[number]['id']

function AccountInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const requestedTab = (searchParams.get('tab') as TabId | null) ?? 'overview'
  const activeTab = requestedTab
  const [profile, setProfile] = useState<MeUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login?redirect=/account')
      return
    }
    let cancelled = false
    smartFetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success) setProfile(data.user)
      })
      .catch(() => {})
      .finally(() => !cancelled && setProfileLoading(false))
    return () => {
      cancelled = true
    }
  }, [user, loading, router])

  function changeTab(id: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'overview') params.delete('tab')
    else params.set('tab', id)
    const qs = params.toString()
    router.replace(`/account${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  if (loading || (!user && !loading)) {
    return <AccountShellSkeleton />
  }

  const initials = (profile?.name || user?.email || 'A')
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <main className="bg-[var(--color-cream-600)] min-h-screen">
      <header className="pt-32 pb-8 px-6 bg-white border-b border-[var(--color-border-soft)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
            <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
              My Account
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[var(--color-gold)] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-lg tracking-wide">
                  {initials}
                </span>
              </div>
              <div>
                <h1 className="font-serif text-2xl font-light text-[var(--color-ink)]">
                  Welcome back,{' '}
                  <span className="font-bold">
                    {profile?.name?.split(' ')[0] || 'there'}
                  </span>
                </h1>
                <p className="text-xs text-gray-400 tracking-wide mt-0.5">
                  {profile?.email}
                  {profile?.createdAt && (
                    <>
                      {' '}
                      • Member since{' '}
                      {new Date(profile.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="hidden sm:flex items-center gap-2 text-[10px] tracking-widest uppercase font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors border border-[var(--color-border)] px-4 py-2"
            >
              <i className="ri-logout-box-line" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav
        className="bg-white border-b border-[var(--color-border-soft)] px-6"
        aria-label="Account sections"
      >
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`flex items-center gap-2 px-5 py-4 text-[11px] tracking-widest uppercase font-semibold whitespace-nowrap transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                  : 'border-transparent text-gray-400 hover:text-[var(--color-ink)]'
              }`}
            >
              <i className={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="transition-all duration-200">
          {activeTab === 'overview' && (
            <AccountOverview
              loading={profileLoading}
              onNavigate={(t) => changeTab(t as TabId)}
            />
          )}
          {activeTab === 'orders' && <AccountOrders />}
          {activeTab === 'wishlist' && <AccountWishlist />}
          {activeTab === 'settings' && (
            <AccountSettings
              profile={profile}
              onProfileUpdate={(u) => setProfile(u)}
            />
          )}
        </div>
      </section>
    </main>
  )
}

export default function AccountClient() {
  return (
    <Suspense fallback={<AccountShellSkeleton />}>
      <AccountInner />
    </Suspense>
  )
}
