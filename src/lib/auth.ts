// src/lib/auth.ts
import { admin } from '@/lib/firebase-admin'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function getUserFromToken(token: string) {
  try {
    return await admin.auth().verifyIdToken(token)
  } catch {
    return null
  }
}

export async function syncUserToDB(token: string) {
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    if (!decoded.email) return null

    await connectDB()

    const email = decoded.email.toLowerCase()
    const isEmailProvider = decoded.firebase?.sign_in_provider === 'password'

    const user = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          name: decoded.name || email,
          email,
          firebaseUid: decoded.uid,
          image: decoded.picture || '',
          role: 'user',          // NEVER update role on sync
          hasPassword: isEmailProvider,
          emailVerified: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    )

    return user
  } catch {
    return null
  }
}