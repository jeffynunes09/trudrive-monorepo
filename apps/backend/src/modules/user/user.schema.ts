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
  // Driver-only fields
  document?: string        // CPF
  licensePlate?: string
  vehicleModel?: string
  vehicleYear?: number
  vehicleColor?: string
  driverLicenseImage?: string  // S3 key
  vehicleDocImage?: string     // S3 key
  pushToken?: string
  averageRating?: number       // média de avaliações do motorista (1-5)
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
    document: { type: String, unique: true, sparse: true },
    licensePlate: { type: String, unique: true, sparse: true },
    vehicleModel: { type: String },
    vehicleYear: { type: Number },
    vehicleColor: { type: String },
    driverLicenseImage: { type: String },
    vehicleDocImage: { type: String },
    pushToken: { type: String },
    averageRating: { type: Number },
  },
  { timestamps: true }
)

// Índice para listagens de admin: filtragem por role/aprovação/ativo
UserSchema.index({ role: 1, isApproved: 1, isActive: 1 })

export const User = model<IUser>('User', UserSchema)
