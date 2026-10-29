import mongoose from 'mongoose';

// SIMULATED ride booking. Stored so it persists across refreshes and shows up
// in the user's dashboard, but no real driver is dispatched.
const rideBookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rideId: { type: String, required: true },
    driver: String,
    car: String,
    icon: String,
    type: { type: String, enum: ['car', 'motorcycle'] },
    pickup: { name: String, lat: Number, lon: Number },
    dropoff: { name: String, lat: Number, lon: Number },
    distanceKm: Number,
    distanceSource: { type: String, enum: ['openrouteservice', 'estimated'] },
    fare: Number,
    etaMinutes: Number,
    status: { type: String, enum: ['booked', 'cancelled', 'arrived'], default: 'booked' },
    pointsAwarded: { type: Number, default: 0 },
    simulated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Simulated arrival time = booking time + ETA.
rideBookingSchema.virtual('arrivesAt').get(function arrivesAt() {
  return new Date(this.createdAt.getTime() + this.etaMinutes * 60 * 1000);
});
rideBookingSchema.set('toJSON', { virtuals: true });

export const RideBooking = mongoose.model('RideBooking', rideBookingSchema);
