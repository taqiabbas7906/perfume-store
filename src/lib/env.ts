import { logger } from './logger'

const requiredEnvVars = [
  'MONGODB_URI',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
]

export function validateEnv() {
  const missing: string[] = []

  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing })
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }

  logger.info('Environment validation passed')
}

export const env = {
  mongodbUri: process.env.MONGODB_URI!,
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  },
  firebaseAdmin: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  nodeEnv: process.env.NODE_ENV || 'development',
}