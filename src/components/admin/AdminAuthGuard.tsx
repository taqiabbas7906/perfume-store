'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/api'
import { AdminUserProvider, type AdminUser } from './AdminUserContext'

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      if (!user) {
        router.push('/login?redirect=/admin/dashboard')
        return
      }
      try {
        const res = await authFetch('/api/auth/me')
        const data = await res.json()
        if (data.user?.role === 'admin') {
          setAdminUser(data.user as AdminUser)
        } else {
          router.push('/')
        }
      } catch {
        router.push('/')
      } finally {
        setChecking(false)
      }
    }
    if (!authLoading) check()
  }, [user, authLoading, router])

  if (authLoading || checking) {
    return (
      <div className="admin-shell min-h-screen flex items-center justify-center bg-paper-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center text-gold-600 text-2xl">
            <i className="ri-loader-4-line animate-spin" />
          </div>
          <p className="text-sm text-charcoal-500">Verifying access…</p>
        </div>
      </div>
    )
  }

  if (!adminUser) return null

  return <AdminUserProvider value={{ user: adminUser }}>{children}</AdminUserProvider>
}
