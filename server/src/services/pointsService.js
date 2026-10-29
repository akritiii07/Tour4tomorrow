import { User } from '../models/User.js';
import { PointsTransaction } from '../models/PointsTransaction.js';
import { config } from '../config/env.js';
import { rewardTiers } from '../data/catalog.js';

// Points are ALWAYS calculated on the server. If the browser could send
// "give me 500 points", anyone could cheat using DevTools.

async function pointsEarnedToday(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [row] = await PointsTransaction.aggregate([
    { $match: { user: userId, createdAt: { $gte: startOfDay }, amount: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return row?.total || 0;
}

/**
 * Award points, respecting the daily cap.
 * Returns the number of points actually awarded (may be 0).
 */
export async function awardPoints(userId, amount, reason, refType, refId) {
  const remaining = Math.max(0, config.dailyPointsCap - (await pointsEarnedToday(userId)));
  const awarded = Math.min(amount, remaining);
  if (awarded <= 0) return 0;

  await PointsTransaction.create({ user: userId, amount: awarded, reason, refType, refId });
  await User.updateOne({ _id: userId }, { $inc: { carbonPoints: awarded } });
  return awarded;
}

/** Take back points (e.g. cancelled ride, deleted trip). Never goes below 0. */
export async function reversePoints(userId, amount, reason, refType, refId) {
  if (!amount) return 0;
  const user = await User.findById(userId);
  const removed = Math.min(amount, user.carbonPoints);
  if (removed <= 0) return 0;
  await PointsTransaction.create({ user: userId, amount: -removed, reason, refType, refId });
  await User.updateOne({ _id: userId }, { $inc: { carbonPoints: -removed } });
  return removed;
}

export function tierInfo(points) {
  const current = [...rewardTiers].reverse().find((t) => points >= t.points) || null;
  const next = rewardTiers.find((t) => t.points > points) || null;
  return {
    current,
    next,
    pointsToNext: next ? next.points - points : 0,
    progressPct: next ? Math.min(100, Math.round((points / next.points) * 100)) : 100,
  };
}
