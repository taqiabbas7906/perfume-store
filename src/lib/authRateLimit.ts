import { NextRequest } from 'next/server'
import { customRateLimit } from './rateLimit'

export const forgotPasswordRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'forgot-password', limit: 5, window: '15 m' })

export const changePasswordRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'change-password', limit: 10, window: '15 m' })

export const syncRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'sync', limit: 30, window: '1 m' })

export const updateProfileRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'update-profile', limit: 20, window: '1 m' })

export const deleteAccountRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'delete-account', limit: 3, window: '1 h' }, { failClosed: true })

export const addressRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'addresses', limit: 30, window: '1 m' })
