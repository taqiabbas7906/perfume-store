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
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5_000,
        socketTimeoutMS: 45_000,
      })
      .catch((err) => {
        // Reset promise so a future call can retry.
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