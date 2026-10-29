import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const AUTH_COOKIE = 't4t_token';

// Why an httpOnly cookie instead of localStorage?
//   JavaScript running in the page (including injected malicious scripts)
//   CANNOT read an httpOnly cookie, so an XSS bug can't steal the token.
//   sameSite='lax' stops other websites from sending it in background requests.
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction, // HTTPS only in production
    sameSite: config.isProduction ? 'none' : 'lax', // 'none' needed if client & API are on different domains
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

async function userFromRequest(req) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return await User.findById(payload.sub);
  } catch {
    return null; // expired / tampered token → treat as logged out
  }
}

// Blocks the request unless a valid user is logged in.
export async function requireAuth(req, res, next) {
  const user = await userFromRequest(req);
  if (!user) return next(new AppError(401, 'Please log in to continue'));
  req.user = user;
  next();
}

// Attaches req.user if logged in, but lets anonymous visitors through.
// Used by the public leaderboard to highlight "You".
export async function optionalAuth(req, res, next) {
  req.user = await userFromRequest(req);
  next();
}
