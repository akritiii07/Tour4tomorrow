// All request-validation rules in one place, written with Zod.
// A schema describes what valid input looks like; validate() middleware
// rejects anything else with a 400 error BEFORE it reaches a controller.
import { z } from 'zod';

const place = z.string().trim().min(2, 'Location is too short').max(120, 'Location is too long');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
  email: z.email('Please enter a valid email address').trim().toLowerCase().max(254),
  // bcrypt only uses the first 72 bytes of a password, so cap the length.
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

export const loginSchema = z.object({
  email: z.email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(72),
});

const tripInputShape = {
  origin: place,
  destination: place,
  startDate: z.iso.date('Start date must be YYYY-MM-DD'),
  endDate: z.iso.date('End date must be YYYY-MM-DD'),
  travelers: z.coerce.number().int().min(1, 'At least 1 traveller').max(20, 'Max 20 travellers'),
  maxBudgetPerNight: z.coerce.number().int().min(1000).max(50000),
};

function checkDates(data, ctx) {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  // "Yesterday in UTC" — a 1-day grace period so users in any time zone can pick their own today.
  const earliest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (start < new Date(earliest)) ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start date is in the past' });
  if (end <= start) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'The end date must be after the start date.' });
  if ((end - start) / 86400000 > 60)
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Trips longer than 60 nights are not supported' });
  if (data.origin.toLowerCase() === data.destination.toLowerCase())
    ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Origin and destination must be different' });
}

export const planTripSchema = z.object(tripInputShape).superRefine(checkDates);

export const saveTripSchema = z
  .object({
    ...tripInputShape,
    transportKey: z.string().max(40),
    stayKey: z.string().max(40),
  })
  .superRefine(checkDates);

export const rideOptionsSchema = z.object({
  pickup: place,
  dropoff: place,
  type: z.enum(['all', 'car', 'motorcycle']).default('all'),
});

export const bookRideSchema = z.object({
  quoteToken: z.string().min(10).max(2000),
  rideId: z.string().max(40),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is empty').max(2000, 'Message is too long (max 2000 characters)'),
});

export const objectIdParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});
