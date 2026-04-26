import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local')
}

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (global.mongoose.conn) {
    return global.mongoose.conn
  }

  if (!global.mongoose.promise) {
    global.mongoose.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  global.mongoose.conn = await global.mongoose.promise
  return global.mongoose.conn
}