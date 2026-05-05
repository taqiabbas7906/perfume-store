import * as admin from 'firebase-admin'

/**
 * Idempotent firebase-admin initialization.
 * We resolve credentials lazily so module evaluation never throws,
 * which is critical for `next build` and `proxy.ts` startup.
 */
function init(): admin.app.App {
  if (admin.apps.length) return admin.app()

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error(
      'Firebase Admin credentials missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    )
  }

  // Newlines in private keys often arrive escaped (literal \"
const privateKey = rawKey.replace(/\\n/g, '\n')

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })
}

export function getAdmin(): admin.app.App {
  return init()
}

// Lazy-init: callers can import `admin` directly; the SDK throws clearly
// when called before init, but our routes go through getAdmin() / functions
// below to guarantee initialization.
export async function verifyIdToken(token: string) {
  return getAdmin().auth().verifyIdToken(token, true)
}

export { admin }