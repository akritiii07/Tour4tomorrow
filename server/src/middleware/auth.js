import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const AUTH_COOKIE = 't4t_token';

// Why an httpOnly cookie instead of localStorage?
//   JavaScript running in the page (including injected malicious scripts)
//   CANNOT read an httpOnly cookie, so an XSS bug can't steal the token.
//   sameSite='lax' stops other websites from sending it in background requests.
//
// Default is 'lax', which is correct when the React app and API share ONE domain
// (local dev with the Vite proxy, or a single Vercel project). Set
// COOKIE_SAMESITE=none only if you host the API on a different domain.
export function cookieOptions() {
  const sameSite = config.cookieSameSite;
  return {
    httpOnly: true,
    secure: config.isProduction || sameSite === 'none', // HTTPS only (browsers require it for 'none')
    sameSite,
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
