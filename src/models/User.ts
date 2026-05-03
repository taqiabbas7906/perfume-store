import mongoose, { Schema } from 'mongoose'
import { IUser } from '@/types'
import { hashPassword, verifyPassword } from '@/lib/password'

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
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
    password: {
      type: String,
    },
    hasPassword: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    image: {
      type: String,
      match: /^https?:\/\/.+/,
    },
    emailVerified: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

UserSchema.index({ email: 1 })
UserSchema.index({ firebaseUid: 1 })

UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date())
})

UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false
  return verifyPassword(candidatePassword, this.password)
}

UserSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    })
  }

  const updates: any = { $inc: { loginAttempts: 1 } }

  const maxAttempts = 5
  const lockTime = 2 * 60 * 60 * 1000

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTime) }
  }

  return this.updateOne(updates)
}

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User