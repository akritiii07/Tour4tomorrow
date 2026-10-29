import { Trip } from '../models/Trip.js';
import { AppError } from '../utils/AppError.js';
import { geocode, getRoute } from '../services/geoService.js';
import { findStaysNear } from '../services/placesService.js';
import { buildPackages, nightsBetween, combinedEcoScore } from '../services/tripPlanner.js';
import { awardPoints, reversePoints } from '../services/pointsService.js';
import { POINTS } from '../data/catalog.js';

// Shared by "plan" and "save": geocode both places and measure the route.
async function resolveJourney(input) {
  // Geocode one after the other (not Promise.all) — Nominatim allows 1 request/second.
  const origin = await geocode(input.origin);
  const destination = await geocode(input.destination);
  const route = await getRoute(origin, destination);
  if (route.distanceKm < 1) throw new AppError(400, 'Origin and destination are the same place');
  const nights = nightsBetween(input.startDate, input.endDate);
  return { origin, destination, route, nights };
}

// POST /api/trips/plan  (public — anyone can explore options)
export async function planTrip(req, res) {
  const input = req.valid.body;
  const { origin, destination, route, nights } = await resolveJourney(input);

  const { transports, stays, packages } = buildPackages({
    distanceKm: route.distanceKm,
    travelers: input.travelers,
    nights,
    maxBudgetPerNight: input.maxBudgetPerNight,
  });

  const nearbyStays = await findStaysNear(destination);

  res.json({
    origin,
    destination,
    nights,
    travelers: input.travelers,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    distanceSource: route.source,
    routeGeometry: route.geometry,
    transports,
    stays,
    packages,
    nearbyStays,
    notes: {
      stays: 'Stay styles and price ranges are ESTIMATES, not live hotel prices or availability.',
      distance:
        route.source === 'openrouteservice'
          ? 'Road distance from openrouteservice.'
          : 'Road distance ESTIMATED (straight-line × 1.25). Add ORS_API_KEY for real routing.',
    },
  });
}

// POST /api/trips  (logged in) — save a chosen plan and earn Carbon Points
export async function saveTrip(req, res) {
  const input = req.valid.body;
  const { origin, destination, route, nights } = await resolveJourney(input);

  // Re-calculate on the server instead of trusting numbers sent by the browser.
  const { transports, stays } = buildPackages({
    distanceKm: route.distanceKm,
    travelers: input.travelers,
    nights,
    maxBudgetPerNight: input.maxBudgetPerNight,
  });
  const transport = transports.find((t) => t.key === input.transportKey);
  const stay = stays.find((s) => s.key === input.stayKey);
  if (!transport || !stay) throw new AppError(400, 'That package is not available for this trip');

  const ecoScore = combinedEcoScore(transport, stay);
  const trip = await Trip.create({
    user: req.user._id,
    origin,
    destination,
    startDate: input.startDate,
    endDate: input.endDate,
    nights,
    travelers: input.travelers,
    maxBudgetPerNight: input.maxBudgetPerNight,
    distanceKm: route.distanceKm,
    distanceSource: route.source,
    transport: { key: transport.key, name: transport.name, co2PerPersonKg: transport.co2PerPersonKg },
    stay: { key: stay.key, name: stay.name, estNightlyLow: stay.estNightlyLow, estNightlyHigh: stay.estNightlyHigh },
    ecoScore,
    co2SavedVsPetrolKg: transport.co2SavedVsPetrolKg,
  });

  const points = await awardPoints(
    req.user._id,
    POINTS.tripPlan(ecoScore),
    `Saved trip: ${input.origin} → ${input.destination}`.slice(0, 120),
    'trip',
    trip._id
  );
  trip.pointsAwarded = points;
  await trip.save();

  res.status(201).json({ trip, pointsAwarded: points, dailyCapReached: points < POINTS.tripPlan(ecoScore) });
}

// GET /api/trips  (logged in) — only YOUR trips
export async function listMyTrips(req, res) {
  const trips = await Trip.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ trips });
}

// DELETE /api/trips/:id  (logged in, owner only)
export async function deleteTrip(req, res) {
  // Filtering by BOTH id and user is the authorization check:
  // you can't delete someone else's trip even if you guess its id.
  const trip = await Trip.findOne({ _id: req.valid.params.id, user: req.user._id });
  if (!trip) throw new AppError(404, 'Trip not found');

  await reversePoints(req.user._id, trip.pointsAwarded, 'Trip plan deleted', 'trip', trip._id);
  await trip.deleteOne();
  res.json({ message: 'Trip deleted' });
}
