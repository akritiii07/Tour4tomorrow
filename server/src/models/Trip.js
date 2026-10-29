import mongoose from 'mongoose';

const placeSchema = new mongoose.Schema(
  { name: String, lat: Number, lon: Number },
  { _id: false }
);

// A saved trip PLAN. Tour4Tomorrow does not sell tickets or hotel rooms, so
// this is the user's chosen low-carbon plan — not a confirmed booking.
const tripSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    origin: { type: placeSchema, required: true },
    destination: { type: placeSchema, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    travelers: { type: Number, required: true, min: 1, max: 20 },
    maxBudgetPerNight: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    distanceSource: { type: String, enum: ['openrouteservice', 'estimated'], required: true },
    transport: {
      key: String,
      name: String,
      co2PerPersonKg: Number, // round trip
    },
    stay: {
      key: String,
      name: String,
      estNightlyLow: Number,
      estNightlyHigh: Number,
    },
    ecoScore: { type: Number, required: true },
    pointsAwarded: { type: Number, default: 0 },
    // How much CO2 this choice saves vs. everyone driving a petrol car.
    co2SavedVsPetrolKg: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Trip = mongoose.model('Trip', tripSchema);
