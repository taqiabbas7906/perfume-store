import { NextRequest } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { IUser } from '@/types'

export async function getAuthUser(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  if (!email) return null

  await connectDB()
  return User.findOne({ email: email.toLowerCase(), active: true }).lean<IUser>()
}

export async function getAuthAdmin(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return null
  return user
}