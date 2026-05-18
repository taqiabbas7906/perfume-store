'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { AdminDashboardSkeleton } from '@/components/ui/Skeleton'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ products: 0, orders: 0 })
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  async function handleAlgoliaSync() {
    setSyncing(true); setSyncMsg('')
    try {
      const res  = await authFetch('/api/admin/algolia/sync', { method: 'POST' })
      const data = await res.json()
      setSyncMsg(data.success ? `Indexed ${data.indexed} products` : (data.error ?? 'Sync failed'))
    } catch {
      setSyncMsg('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return
      try {
        const res = await authFetch('/api/auth/me')
        const data = await res.json()
        if (data.user?.role === 'admin') {
          setIsAdmin(true)
        } else {
          router.push('/')
        }
      } catch (err) {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      checkAdmin()
    }
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return <AdminDashboardSkeleton />
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/products"
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Products</h2>
          <p className="text-gray-600">Manage your product catalog</p>
        </Link>
        <Link
          href="/admin/orders"
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Orders</h2>
          <p className="text-gray-600">View and manage customer orders</p>
        </Link>
        <Link
          href="/admin/vouchers"
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Vouchers</h2>
          <p className="text-gray-600">Create and manage discount vouchers</p>
        </Link>
        <Link
          href="/admin/catalog"
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Catalog</h2>
          <p className="text-gray-600">Manage categories, brands, collections & image uploads</p>
        </Link>
        <Link
          href="/admin/inventory"
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Inventory</h2>
          <p className="text-gray-600">Stock levels, low-stock alerts, manual adjustments & audit log</p>
        </Link>
        <Link
          href="/admin/users"
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <p className="text-gray-600">View accounts, manage roles, ban or unban users</p>
        </Link>
        <Link
          href="/admin/analytics"
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Analytics</h2>
          <p className="text-gray-600">Revenue, orders, top products, geo and customer insights</p>
        </Link>
        <Link
          href="/admin/reviews"
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Reviews</h2>
          <p className="text-gray-600">Moderate product reviews — approve or reject pending submissions</p>
        </Link>
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Search Index</h2>
          <p className="text-gray-600 mb-4">Bulk-sync all active products to the Algolia search index</p>
          <button
            onClick={handleAlgoliaSync}
            disabled={syncing}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {syncing ? 'Syncing…' : 'Sync Algolia Index'}
          </button>
          {syncMsg && (
            <p className={`mt-2 text-sm ${syncMsg.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
              {syncMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
