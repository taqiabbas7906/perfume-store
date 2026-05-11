'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ products: 0, orders: 0 })

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
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
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
      </div>
    </div>
  )
}
