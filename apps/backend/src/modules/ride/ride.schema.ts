import { Schema, model, Document, Types } from 'mongoose'

export type RideStatus =
  | 'pending'
  | 'searching_driver'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface ICoordinate {
  lat: number
  lng: number
  address: string
}

export interface IRide extends Document {
  riderId: Types.ObjectId
  driverId?: Types.ObjectId
  origin: ICoordinate
  destination: ICoordinate
  status: RideStatus
  fare?: number
  distance?: number
  duration?: number
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  cancelledAt?: Date
  cancelledBy?: 'rider' | 'driver' | 'admin'
  createdAt: Date
  updatedAt: Date
}

const CoordinateSchema = new Schema<ICoordinate>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
})

const RideSchema = new Schema<IRide>(
  {
    riderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    origin: { type: CoordinateSchema, required: true },
    destination: { type: CoordinateSchema, required: true },
    status: {
      type: String,
      enum: ['pending', 'searching_driver', 'driver_assigned', 'driver_en_route', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    fare: { type: Number },
    distance: { type: Number },
    duration: { type: Number },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['rider', 'driver', 'admin'] },
  },
  { timestamps: true }
)

export const Ride = model<IRide>('Ride', RideSchema)
