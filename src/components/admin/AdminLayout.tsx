'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/logout'
import { useAdminUser } from './AdminUserContext'

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { path: '/admin/products', label: 'Products', icon: 'ri-shopping-bag-3-line' },
  { path: '/admin/categories', label: 'Categories', icon: 'ri-apps-line' },
  { path: '/admin/orders', label: 'Orders', icon: 'ri-file-list-3-line' },
  { path: '/admin/reviews', label: 'Reviews', icon: 'ri-star-line' },
  { path: '/admin/vouchers', label: 'Vouchers', icon: 'ri-coupon-line' },
  { path: '/admin/newsletter', label: 'Newsletter', icon: 'ri-mail-send-line' },
  { path: '/admin/users', label: 'Users', icon: 'ri-user-settings-line' },
  { path: '/admin/search-sync', label: 'Search Sync', icon: 'ri-search-2-line' },
]

function initialsOf(name?: string, email?: string) {
  const source = (name && name.trim()) || (email && email.split('@')[0]) || ''
  if (!source) return 'U'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function roleLabel(role: string) {
  return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useAdminUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /** Close the avatar dropdown on outside click. */
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  async function handleLogout() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Admin'
  const initials = initialsOf(user?.name, user?.email)

  return (
    <div className="admin-shell min-h-screen flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-charcoal-900 text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <Link
            href="/"
            className="text-xl font-serif font-semibold tracking-wide flex items-center gap-2 text-white"
          >
            <i className="ri-drop-fill text-gold-400" />
            Minzoshop
          </Link>
          <p className="text-xs text-charcoal-400 mt-1 ml-7">Admin Portal</p>
        </div>

        <nav className="px-3 pb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-400 px-3 mb-3 mt-2">
            Management
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                  isActive
                    ? 'bg-gold-600 text-white'
                    : 'text-charcoal-300 hover:bg-charcoal-800 hover:text-white'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className={item.icon} />
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-paper-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <button
            className="lg:hidden w-9 h-9 flex items-center justify-center text-charcoal-700 hover:bg-paper-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <i className="ri-menu-line" />
          </button>

          <div ref={menuRef} className="relative ml-auto">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2.5 text-sm text-charcoal-700 hover:bg-paper-50 rounded-lg pl-1.5 pr-2.5 py-1 transition-colors"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gold-100 text-gold-700 font-semibold text-sm shrink-0">
                {initials}
              </span>
              <span className="hidden md:flex flex-col items-start leading-tight">
                <span className="font-medium text-charcoal-900">{displayName}</span>
                {user?.role && (
                  <span className="text-[10px] uppercase tracking-wider text-charcoal-400">
                    {roleLabel(user.role)}
                  </span>
                )}
              </span>
              <i
                className={`ri-arrow-down-s-line text-charcoal-400 hidden md:block transition-transform ${
                  menuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 bg-white border border-paper-200 rounded-lg shadow-lg overflow-hidden z-40"
              >
                <div className="px-4 py-3 border-b border-paper-100">
                  <p className="text-sm font-medium text-charcoal-900 truncate">
                    {displayName}
                  </p>
                  {user?.email && (
                    <p className="text-xs text-charcoal-500 truncate">{user.email}</p>
                  )}
                  {user?.role && (
                    <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wider bg-gold-50 text-gold-700 px-2 py-0.5 rounded font-medium">
                      {roleLabel(user.role)}
                    </span>
                  )}
                </div>
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-paper-50 transition-colors"
                  role="menuitem"
                >
                  <i className="ri-user-line text-charcoal-400" />
                  My account
                </Link>
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-paper-50 transition-colors"
                  role="menuitem"
                >
                  <i className="ri-home-line text-charcoal-400" />
                  Back to site
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    void handleLogout()
                  }}
                  disabled={signingOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left border-t border-paper-100 disabled:opacity-50"
                  role="menuitem"
                >
                  <i
                    className={
                      signingOut
                        ? 'ri-loader-4-line animate-spin'
                        : 'ri-logout-box-line'
                    }
                  />
                  {signingOut ? 'Signing out…' : 'Logout'}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
