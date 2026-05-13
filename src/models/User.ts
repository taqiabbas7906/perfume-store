import mongoose, { Schema } from 'mongoose'
import { IUser } from '@/types'
import { verifyPassword } from '@/lib/password'

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    // unique:true creates the index — do NOT add a separate `.index()` call.
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      immutable: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String, select: false },
    hasPassword: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      validate: {
        validator: (v: string | undefined) => !v || /^\+?[\d\s\-().]{7,30}$/.test(v),
        message: 'phone must be a valid phone number',
      },
    },
    emailVerified: { type: Date },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, select: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
  },
  { timestamps: true }
)

UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date())
})

UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false
  return verifyPassword(candidate, this.password)
}

UserSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    })
  }

  const updates: Record<string, unknown> = { $inc: { loginAttempts: 1 } }
  const maxAttempts = 5
  const lockTime = 2 * 60 * 60 * 1000 // 2h
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTime) }
  }
  return this.updateOne(updates)
}

const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema)

export default User