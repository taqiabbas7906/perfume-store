import mongoose, { Schema } from 'mongoose'
import { IUser } from '@/types'

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      immutable: true,
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
    },
    emailVerified: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User