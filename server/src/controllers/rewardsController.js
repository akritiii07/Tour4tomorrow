import { User } from '../models/User.js';
import { PointsTransaction } from '../models/PointsTransaction.js';
import { rewardTiers } from '../data/catalog.js';
import { tierInfo } from '../services/pointsService.js';
import { config } from '../config/env.js';

// GET /api/rewards/tiers  (public)
export function getTiers(req, res) {
  res.json({ tiers: rewardTiers, dailyPointsCap: config.dailyPointsCap });
}

// GET /api/rewards/me  (logged in) — balance, tier progress, and history
export async function myRewards(req, res) {
  const history = await PointsTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('amount reason refType createdAt');

  res.json({
    points: req.user.carbonPoints,
    ...tierInfo(req.user.carbonPoints),
    history,
  });
}

// GET /api/rewards/leaderboard  (public; highlights you if logged in)
export async function leaderboard(req, res) {
  const top = await User.find({ carbonPoints: { $gt: 0 } })
    .sort({ carbonPoints: -1, createdAt: 1 })
    .limit(10)
    .select('name carbonPoints');

  // Privacy: only first names are shown publicly — never emails.
  const entries = top.map((u, i) => ({
    rank: i + 1,
    name: u.name.split(' ')[0],
    points: u.carbonPoints,
    isYou: Boolean(req.user && u._id.equals(req.user._id)),
  }));

  let you = null;
  if (req.user) {
    const higher = await User.countDocuments({ carbonPoints: { $gt: req.user.carbonPoints } });
    you = { rank: higher + 1, name: req.user.name.split(' ')[0], points: req.user.carbonPoints };
  }

  res.json({ entries, you });
}
