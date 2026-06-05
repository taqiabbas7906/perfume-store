import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { verifyIdToken } from '@/lib/firebaseAdmin'
import { logger } from '@/lib/logger'
import type { IUser } from '@/types'

type DecodedToken = Awaited<ReturnType<typeof verifyIdToken>>

function displayNameFor(
  decoded: DecodedToken,
  email: string,
  requestedName?: string,
) {
  // Preference order: explicit name from the signup request (most
  // trustworthy — it's what the customer typed), then Firebase's profile
  // name (set on social logins / after updateProfile), then the email
  // prefix as a last resort.
  const raw =
    requestedName?.trim() ||
    decoded.name?.trim() ||
    email.split('@')[0]?.trim() ||
    'Customer'
  return raw.length >= 2 ? raw.slice(0, 100) : 'Customer'
}

function isPasswordProvider(decoded: DecodedToken) {
  return decoded.firebase?.sign_in_provider === 'password'
}

function canLinkEmailUser(user: IUser, decoded: DecodedToken) {
  if (!user.firebaseUid || user.firebaseUid === decoded.uid) return true
  return decoded.email_verified === true || isPasswordProvider(decoded)
}

async function findPublicUserByFirebaseUid(uid: string) {
  return User.findOne({ firebaseUid: uid }).select('-password -__v').lean<IUser>()
}

async function findPublicUserByEmail(email: string) {
  return User.findOne({ email }).select('-password -__v').lean<IUser>()
}

function duplicateKey(err: unknown) {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  )
}

export async function getUserFromToken(token: string) {
  try {
    return await verifyIdToken(token)
  } catch {
    return null
  }
}

export async function ensureUserFromDecoded(
  decoded: DecodedToken,
  requestedName?: string,
): Promise<IUser | null> {
  if (!decoded.uid || !decoded.email) return null

  await connectDB()

  const email = decoded.email.toLowerCase()
  const now = new Date()
  // Only overwrite an existing user's name when the request or the token
  // carries one — otherwise we'd downgrade a stored full name to the email
  // prefix on every subsequent login.
  const hasIncomingName =
    !!(requestedName?.trim() || decoded.name?.trim())
  const name = displayNameFor(decoded, email, requestedName)
  const set: Record<string, unknown> = { lastLogin: now }
  if (hasIncomingName) set.name = name

  if (decoded.email_verified) set.emailVerified = now
  if (isPasswordProvider(decoded)) set.hasPassword = true

  const byUid = await findPublicUserByFirebaseUid(decoded.uid)
  if (byUid) {
    if (!byUid.active) return null

    return User.findByIdAndUpdate(
      byUid._id,
      { $set: set },
      { returnDocument: 'after', runValidators: true }
    )
      .select('-password -__v')
      .lean<IUser>()
  }

  const byEmail = await findPublicUserByEmail(email)
  if (byEmail) {
    if (!byEmail.active || !canLinkEmailUser(byEmail, decoded)) return null

    return User.findByIdAndUpdate(
      byEmail._id,
      { $set: { ...set, firebaseUid: decoded.uid } },
      { returnDocument: 'after', runValidators: true }
    )
      .select('-password -__v')
      .lean<IUser>()
  }

  const insert: Record<string, unknown> = {
    email,
    firebaseUid: decoded.uid,
    name,
    role: 'user',
    hasPassword: isPasswordProvider(decoded),
    active: true,
  }
  if (decoded.email_verified) insert.emailVerified = now

  try {
    const user = await User.findOneAndUpdate(
      { firebaseUid: decoded.uid },
      {
        $setOnInsert: insert,
        $set: { lastLogin: now },
      },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    )
      .select('-password -__v')
      .lean<IUser>()

    return user
  } catch (err) {
    if (duplicateKey(err)) {
      const existing = await findPublicUserByEmail(email)
      if (existing?.active && canLinkEmailUser(existing, decoded)) {
        return User.findByIdAndUpdate(
          existing._id,
          { $set: { ...set, firebaseUid: decoded.uid } },
          { returnDocument: 'after', runValidators: true }
        )
          .select('-password -__v')
          .lean<IUser>()
      }
    }

    logger.warn({ err, uid: decoded.uid }, 'auth sync failed')
    return null
  }
}

export async function syncUserToDB(token: string, requestedName?: string) {
  try {
    const decoded = await verifyIdToken(token)
    return ensureUserFromDecoded(decoded, requestedName)
  } catch (err) {
    logger.warn({ err }, 'firebase token verification failed during sync')
    return null
  }
}
