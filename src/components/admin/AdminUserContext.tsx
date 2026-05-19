'use client'

import { createContext, useContext } from 'react'

export interface AdminUser {
  _id: string
  name?: string
  email: string
  role: string
}

interface AdminUserContextValue {
  user: AdminUser | null
}

const AdminUserContext = createContext<AdminUserContextValue>({ user: null })

export const AdminUserProvider = AdminUserContext.Provider

export function useAdminUser(): AdminUser | null {
  return useContext(AdminUserContext).user
}
