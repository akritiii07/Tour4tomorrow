// ⚠️ SIMULATED eco-ride demo.
// Locations and distances are REAL (geocoded + routed); drivers, ETAs and
// tracking are SIMULATED because we are not connected to a ride-hailing network.
import jwt from 'jsonwebtoken';
import { RideBooking } from '../models/RideBooking.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/env.js';
import { geocode, getRoute } from '../services/geoService.js';
import { awardPoints, reversePoints } from '../services/pointsService.js';
import { rideFleet, POINTS } from '../data/catalog.js';

const MAX_RIDE_KM = 100;
const QUOTE_AUDIENCE = 'ride-quote';

const fareFor = (ride, km) => Math.round(ride.baseFare + ride.perKmRate * km);

// GET /api/rides/options?pickup=..&dropoff=..&type=all
export async function rideOptions(req, res) {
  const { pickup, dropoff, type } = req.valid.query;
  const from = await geocode(pickup);
  const to = await geocode(dropoff);
  const route = await getRoute(from, to);

  if (route.distanceKm > MAX_RIDE_KM)
    throw new AppError(400, `Eco-rides are for local trips under ${MAX_RIDE_KM} km. Try the trip planner instead.`);

  // A "quote token" is a short-lived signed note of the route we measured.
  // When the user books, the server reads the distance from this token instead
  // of trusting a distance (or fare) sent by the browser — it can't be edited.
  const quoteToken = jwt.sign(
    { from, to, distanceKm: route.distanceKm, source: route.source },
    config.jwtSecret,
    { expiresIn: '10m', audience: QUOTE_AUDIENCE }
  );

  const options = rideFleet
    .filter((r) => type === 'all' || r.type === type)
    .map((r) => ({ ...r, fare: fareFor(r, route.distanceKm) }));

  res.json({
    simulated: true,
    pickup: from,
    dropoff: to,
    distanceKm: route.distanceKm,
    distanceSource: route.source,
    options,
    quoteToken,
  });
}

async function findActiveRide(userId) {
  const ride = await RideBooking.findOne({ user: userId, status: 'booked' }).sort({ createdAt: -1 });
  if (ride && ride.arrivesAt <= new Date()) {
    ride.status = 'arrived'; // simulated arrival time has passed
    await ride.save();
  }
  return ride;
}

// POST /api/rides  { quoteToken, rideId }
export async function bookRide(req, res) {
  const { quoteToken, rideId } = req.valid.body;

  let quote;
  try {
    quote = jwt.verify(quoteToken, config.jwtSecret, { audience: QUOTE_AUDIENCE });
  } catch {
    throw new AppError(400, 'This ride quote has expired. Please search again.');
  }

  const ride = rideFleet.find((r) => r.id === rideId);
  if (!ride) throw new AppError(400, 'Unknown ride option');

  const active = await findActiveRide(req.user._id);
  if (active?.status === 'booked') throw new AppError(409, 'You already have a ride on the way. Cancel it first.');

  const booking = await RideBooking.create({
    user: req.user._id,
    rideId: ride.id,
    driver: ride.driver,
    car: ride.car,
    icon: ride.icon,
    type: ride.type,
    pickup: quote.from,
    dropoff: quote.to,
    distanceKm: quote.distanceKm,
    distanceSource: quote.source,
    fare: fareFor(ride, quote.distanceKm),
    etaMinutes: ride.eta,
  });

  const points = await awardPoints(req.user._id, POINTS.RIDE_BOOKED, `Eco-ride with ${ride.driver}`, 'ride', booking._id);
  booking.pointsAwarded = points;
  await booking.save();

  res.status(201).json({ ride: booking, pointsAwarded: points, simulated: true });
}

// GET /api/rides/active
export async function activeRide(req, res) {
  const ride = await findActiveRide(req.user._id);
  res.json({ ride: ride || null, serverTime: new Date() });
}

// GET /api/rides  — ride history
export async function listMyRides(req, res) {
  const rides = await RideBooking.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ rides });
}

// POST /api/rides/:id/cancel
export async function cancelRide(req, res) {
  const ride = await RideBooking.findOne({ _id: req.valid.params.id, user: req.user._id });
  if (!ride) throw new AppError(404, 'Ride not found');
  if (ride.status !== 'booked') throw new AppError(400, `This ride is already ${ride.status}`);

  ride.status = 'cancelled';
  await ride.save();
  // Otherwise people could book & cancel repeatedly to farm points.
  const removed = await reversePoints(req.user._id, ride.pointsAwarded, `Cancelled ride with ${ride.driver}`, 'ride', ride._id);
  res.json({ ride, pointsRemoved: removed });
}
