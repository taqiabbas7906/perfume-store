'use client'

import { AuthProvider, useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { logout } from '@/lib/logout'
import './globals.css'

function Navbar() {
  const { user, loading } = useAuth()

  return (
    <nav className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">Perfume Store</Link>
          <div className="flex items-center gap-6">
            <Link href="/products" className="hover:text-gray-300">Products</Link>
            {user && (
              <>
                <Link href="/cart" className="hover:text-gray-300">Cart</Link>
                <button onClick={logout} className="hover:text-gray-300">Logout</button>
              </>
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
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}