import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { verifyIdToken } from '@/lib/firebaseAdmin'

export async function getUserFromToken(token: string) {
  try {
    return await verifyIdToken(token)
  } catch {
    return null
  }
}

export async function syncUserToDB(token: string) {
  try {
    const decoded = await verifyIdToken(token)
    if (!decoded.email) return null

    await connectDB()

    const email = decoded.email.toLowerCase()
    const isEmailProvider = decoded.firebase?.sign_in_provider === 'password'
    const now = new Date()

    const user = await User.findOneAndUpdate(
      { firebaseUid: decoded.uid },
      {
        $setOnInsert: {
          email,
          firebaseUid: decoded.uid,
          role: 'user',
          hasPassword: isEmailProvider,
          emailVerified: decoded.email_verified ? now : undefined,
          active: true,
        },
        $set: {
          name: decoded.name || email.split('@')[0],
          lastLogin: now,
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    )

    return user
  } catch {
    return null
  }
}
