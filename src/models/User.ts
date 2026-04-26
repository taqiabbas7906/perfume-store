import mongoose, { Schema, Model } from "mongoose";
import { IUser } from "@/types";

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
        },
        password: {
            type: String,
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
const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User