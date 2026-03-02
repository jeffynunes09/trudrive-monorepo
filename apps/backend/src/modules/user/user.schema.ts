import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  passwordHash?: string
  phone?: string
  role: 'driver' | 'rider' | 'admin'
  profileImage?: string
  isActive: boolean
  isApproved: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    phone: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['driver', 'rider', 'admin'], required: true },
    profileImage: { type: String },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const User = model<IUser>('User', UserSchema)
