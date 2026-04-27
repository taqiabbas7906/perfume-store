import { NextRequest } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { IUser } from '@/types'

export async function getAuthUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split(' ')[1]

    if (!token) return null

    const decoded = await getUserFromToken(token)

    if (!decoded) return null

    await connectDB()

    const user = await User.findOne({ email: decoded.email }).lean<IUser>()

    return user

  } catch (error) {
    return null
  }
}

export async function getAuthAdmin(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    if (!user) return null

    if (user.role !== 'admin') return null

    return user

  } catch (error) {
    return null
  }
}