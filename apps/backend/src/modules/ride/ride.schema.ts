import { Schema, model, Document } from 'mongoose'

export type RideStatus =
  | 'pending'
  | 'searching_driver'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'in_progress'
  | 'payment_pending'
  | 'paid'
  | 'completed'
  | 'cancelled'

export interface ICoordinate {
  lat: number
  lng: number
  address: string
}

export interface IRide extends Document {
  id: string
  riderId: string
  driverId?: string
  origin: ICoordinate
  destination: ICoordinate
  status: RideStatus
  otp: string                      // código gerado na criação, visível para o passageiro
  otpVerified: boolean             // true após motorista confirmar embarque com OTP
  rejectedByDriverIds: string[]    // motoristas que recusaram esta corrida (blacklist)
  fare?: number
  distance?: number
  duration?: number
  geometry?: [number, number][]    // [lng, lat] pairs from ORS
  paymentConfirmed?: boolean
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  cancelledAt?: Date
  cancelledBy?: 'rider' | 'driver' | 'admin'
  cancellationFee?: number         // taxa cobrada por cancelamento após embarque
  secondRideNotified?: boolean     // flag persistida: motorista recebeu aviso de segunda corrida disponível
  driverRating?: number            // avaliação do motorista pelo passageiro (1-5)
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
    riderId: { type: String, required: true },
    driverId: { type: String },
    origin: { type: CoordinateSchema, required: true },
    destination: { type: CoordinateSchema, required: true },
    status: {
      type: String,
      enum: ['pending', 'searching_driver', 'driver_assigned', 'driver_en_route', 'in_progress', 'payment_pending', 'paid', 'completed', 'cancelled'],
      default: 'pending',
    },
    otp: { type: String, required: true },
    otpVerified: { type: Boolean, default: false },
    rejectedByDriverIds: { type: [String], default: [] },
    fare: { type: Number },
    distance: { type: Number },
    duration: { type: Number },
    geometry: { type: Schema.Types.Mixed },
    paymentConfirmed: { type: Boolean, default: false },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['rider', 'driver', 'admin'] },
    cancellationFee: { type: Number },
    secondRideNotified: { type: Boolean, default: false },
    driverRating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
)

// Índices para queries comuns — evita full collection scan
RideSchema.index({ riderId: 1, status: 1 })
RideSchema.index({ driverId: 1, status: 1 })
RideSchema.index({ status: 1, createdAt: -1 })
RideSchema.index({ createdAt: -1 })

export const Ride = model<IRide>('Ride', RideSchema)
