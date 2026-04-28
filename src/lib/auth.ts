import { admin } from '@/lib/firebase-admin'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function getUserFromToken(token: string) {
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    return decoded
  } catch (error) {
    return null
  }
}

export async function syncUserToDB(token: string) {
  try {
    const decoded = await admin.auth().verifyIdToken(token)

    await connectDB()

    let user = await User.findOne({ email: decoded.email?.toLowerCase() })

    const isEmailProvider = decoded.firebase?.sign_in_provider === 'password'

    if (!user) {
      user = await User.create({
        name: decoded.name || decoded.email,
        email: decoded.email?.toLowerCase(),
        firebaseUid: decoded.uid,
        image: decoded.picture || '',
        role: 'user',
        hasPassword: isEmailProvider,
        emailVerified: new Date(),
      })
    }

    return user
  } catch (error) {
    return null
  }
}