'use client'

import { useAuth } from '@/context/AuthContext'
import { logout } from '@/lib/logout'
import { authFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'

export default function Home() {
  const { user, token, loading } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [hasPassword, setHasPassword] = useState(false)

  // SAFE provider access (fix TS crash)
  const providerId = user?.providerData?.[0]?.providerId ?? ''

  const isGoogleUser = providerId === 'google.com'
  const isFacebookUser = providerId === 'facebook.com'
  const isAppleUser = providerId === 'apple.com'
  const isSocialUser = isGoogleUser || isFacebookUser || isAppleUser

  const fetchUserData = useCallback(async () => {
    try {
      const res = await authFetch('/api/auth/me')
      const data = await res.json()

      if (data?.user) {
        setHasPassword(Boolean(data.user.hasPassword))
      }
    } catch {
      // silent fail
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void fetchUserData().catch(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [user, fetchUserData])

  const handleChangePassword = async () => {
    setMessage('')
    setError('')

    if (!newPassword || !confirmPassword) {
      setError('Password fields cannot be empty')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : '',
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage(data.message || 'Password updated successfully')
        setHasPassword(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (loading) {
    return <h1>Loading...</h1>
  }

  return (
    <main style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      {user ? (
        <div>
          <h1>Welcome {user.displayName || user.email || 'User'}</h1>
          <p>Email: {user.email ?? 'N/A'}</p>
          <p>Token exists: {token ? 'Yes' : 'No'}</p>
          <p>Login provider: {providerId || 'unknown'}</p>

          <div style={{ marginTop: '20px' }}>
            <h2>{!hasPassword ? 'Set Password' : 'Change Password'}</h2>

            {isSocialUser && !hasPassword && (
              <p style={{ color: 'blue', fontSize: '14px', marginBottom: '10px' }}>
                You signed in with social login. Set a password to also login with email.
              </p>
            )}

            {hasPassword && (
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                data-testid="current-password-input"
              />
            )}

            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              data-testid="new-password-input"
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              data-testid="confirm-password-input"
            />

            <button
              onClick={handleChangePassword}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              data-testid="change-password-btn"
            >
              {!hasPassword ? 'Set Password' : 'Change Password'}
            </button>

            {message && <p style={{ color: 'green' }}>{message}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </div>

          <button
            onClick={logout}
            style={{ width: '100%', padding: '10px' }}
            data-testid="logout-btn"
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