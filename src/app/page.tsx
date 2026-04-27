'use client'

import { useAuth } from '@/context/AuthContext'
import { logout } from '@/lib/logout'
import { authFetch } from '@/lib/api'
import { useState } from 'react'

export default function Home() {
  const { user, token, loading } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isGoogleUser = user?.providerData?.[0]?.providerId === 'google.com'
  const isEmailUser = user?.providerData?.[0]?.providerId === 'password'

  const handleChangePassword = async () => {
    setMessage('')
    setError('')
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: isEmailUser ? currentPassword : '',
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage(data.message)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return <h1>Loading...</h1>
  }

  return (
    <main style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      {user ? (
        <div>
          <h1>Welcome {user.displayName || user.email}</h1>
          <p>Email: {user.email}</p>
          <p>Token exists: {token ? 'Yes' : 'No'}</p>
          <p>Login provider: {user?.providerData?.[0]?.providerId}</p>

          <div style={{ marginTop: '20px' }}>
            <h2>
              {isGoogleUser ? 'Set Password' : 'Change Password'}
            </h2>

            {isGoogleUser && (
              <p style={{ color: 'blue', fontSize: '14px' }}>
                You signed in with Google. You can set a password to also login with email.
              </p>
            )}

            {isEmailUser && (
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              />
            )}

            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <button
              onClick={handleChangePassword}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            >
              {isGoogleUser ? 'Set Password' : 'Change Password'}
            </button>

            {message && (
              <p style={{ color: 'green' }}>{message}</p>
            )}
            {error && (
              <p style={{ color: 'red' }}>{error}</p>
            )}
          </div>

          <button
            onClick={logout}
            style={{ width: '100%', padding: '10px' }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div>
          <h1>Not logged in</h1>
          <a href="/login">Go to Login</a>
        </div>
      )}
    </main>
  )
}