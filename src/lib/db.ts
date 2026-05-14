import mongoose from 'mongoose'

/**
 * Connection cache to survive Next.js HMR & serverless cold starts.
 *
 * We use `globalThis.__mongooseCache` (private name) to avoid colliding
 * with mongoose's own type aliases.
 */
type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalForMongoose = globalThis as unknown as {
  __mongooseCache?: MongooseCache
}

const cache: MongooseCache =
  globalForMongoose.__mongooseCache ??
  (globalForMongoose.__mongooseCache = { conn: null, promise: null })

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  if (!cache.promise) {
    const isProd = process.env.NODE_ENV === 'production'
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: Number(process.env.MONGO_MAX_POOL ?? (isProd ? 50 : 10)),
        minPoolSize: Number(process.env.MONGO_MIN_POOL ?? (isProd ? 5 : 0)),
        serverSelectionTimeoutMS: 5_000,
        socketTimeoutMS: 45_000,
        maxIdleTimeMS: 60_000,
        retryWrites: true,
        retryReads: true,
        compressors: ['zstd', 'zlib'],
        appName: process.env.SERVICE_NAME ?? 'perfume-store',
      })
      .catch((err) => {
        cache.promise = null
        throw err
      })
  }

  cache.conn = await cache.promise
  return cache.conn
}

export async function disconnectDB(): Promise<void> {
  if (cache.conn) {
    await mongoose.disconnect()
    cache.conn = null
    cache.promise = null
  }
}

/* ─────────────────────────────────────────────
 * GRACEFUL SHUTDOWN
 *
 * Registered once at module load. On SIGTERM/SIGINT we drain the Mongo pool
 * before the process exits so in-flight queries complete cleanly.
 * ───────────────────────────────────────────── */
const globalForShutdown = globalThis as unknown as { __shutdownInstalled?: boolean }

if (!globalForShutdown.__shutdownInstalled && typeof process !== 'undefined') {
  globalForShutdown.__shutdownInstalled = true

  const handler = (signal: NodeJS.Signals) => {
    Promise.resolve(disconnectDB())
      .catch(() => {})
      .finally(() => process.exit(signal === 'SIGINT' ? 130 : 0))
  }

  process.once('SIGTERM', handler)
  process.once('SIGINT', handler)
}