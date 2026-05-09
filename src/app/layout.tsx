'use client'

import { AuthProvider, useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { logout } from '@/lib/logout'
import { smartFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import './globals.css'

function Navbar() {
  const { user, loading } = useAuth()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await smartFetch('/api/cart')
        const data = await res.json()
        if (data.success) setCartCount(data.itemCount ?? 0)
      } catch {}
    }
    if (!loading) fetchCount()
  }, [user, loading])

  return (
    <nav className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">Perfume Store</Link>
          <div className="flex items-center gap-6">
            <Link href="/products" className="hover:text-gray-300">Products</Link>
            <Link href="/cart" className="hover:text-gray-300 relative">
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
            {user && (
              <button onClick={logout} className="hover:text-gray-300">Logout</button>
            )}
            {!user && !loading && (
              <Link href="/login" className="hover:text-gray-300">Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="text/javascript"
          src="https://sandbox.web.squarecdn.com/v1/square.js"
        ></script>
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}