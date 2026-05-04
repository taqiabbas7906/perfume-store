import { NextRequest } from 'next/server'
import { customRateLimit } from './rateLimit'

export const forgotPasswordRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'forgot-password', limit: 5, window: '15 m' })

export const changePasswordRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'change-password', limit: 10, window: '15 m' })

export const syncRateLimit = (req: NextRequest) =>
  customRateLimit(req, { name: 'sync', limit: 30, window: '1 m' })
