// All API routes in one file so you can see the whole API at a glance.
// Pattern for each line:  router.METHOD(path, ...middleware, controller)
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as v from '../validators.js';
import * as auth from '../controllers/authController.js';
import * as trips from '../controllers/tripController.js';
import * as rides from '../controllers/rideController.js';
import * as rewards from '../controllers/rewardsController.js';
import * as chat from '../controllers/chatController.js';
import * as carbon from '../controllers/carbonController.js';

const router = Router();

// ── Rate limiters: stop brute-force logins and runaway AI bills ─────────────
const limiter = (windowMin, max, message) =>
  rateLimit({ windowMs: windowMin * 60 * 1000, limit: max, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: message } });

const authLimiter = limiter(15, 20, 'Too many login attempts. Please wait 15 minutes.');
const geoLimiter = limiter(1, 20, 'Too many searches. Please slow down a little.');
const chatLimiter = limiter(60, 40, 'Chat limit reached for this hour. Please try again later.');

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Auth
router.post('/auth/register', authLimiter, validate(v.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(v.loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
// Returns { user: null } (not 401) when logged out, so the page-load check isn't an "error".
router.get('/auth/me', optionalAuth, auth.me);

// Carbon factors (public)
router.get('/carbon/factors', carbon.getFactors);

// Trips
router.post('/trips/plan', geoLimiter, validate(v.planTripSchema), trips.planTrip);
router.get('/trips', requireAuth, trips.listMyTrips);
router.post('/trips', requireAuth, geoLimiter, validate(v.saveTripSchema), trips.saveTrip);
router.delete('/trips/:id', requireAuth, validate(v.objectIdParam, 'params'), trips.deleteTrip);

// Rides (simulated demo)
router.get('/rides/options', geoLimiter, validate(v.rideOptionsSchema, 'query'), rides.rideOptions);
router.get('/rides/active', requireAuth, rides.activeRide);
router.get('/rides', requireAuth, rides.listMyRides);
router.post('/rides', requireAuth, validate(v.bookRideSchema), rides.bookRide);
router.post('/rides/:id/cancel', requireAuth, validate(v.objectIdParam, 'params'), rides.cancelRide);

// Rewards
router.get('/rewards/tiers', rewards.getTiers);
router.get('/rewards/leaderboard', optionalAuth, rewards.leaderboard);
router.get('/rewards/me', requireAuth, rewards.myRewards);

// AI chatbot (logged-in users only — every message costs API credits)
router.get('/chat/status', chat.chatStatus);
router.get('/chat/history', requireAuth, chat.getHistory);
router.post('/chat', requireAuth, chatLimiter, validate(v.chatSchema), chat.sendMessage);
router.delete('/chat/history', requireAuth, chat.clearHistory);

export default router;
