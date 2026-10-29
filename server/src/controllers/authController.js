import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { AUTH_COOKIE, cookieOptions, signToken } from '../middleware/auth.js';

// POST /api/auth/register
export async function register(req, res) {
  const { name, email, password } = req.valid.body;

  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists');

  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();

  res.cookie(AUTH_COOKIE, signToken(user._id), cookieOptions());
  res.status(201).json({ user: user.toPublic() });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  // Same message for "no such user" and "wrong password" so attackers can't
  // discover which emails are registered.
  if (!user || !(await user.checkPassword(password))) {
    throw new AppError(401, 'Invalid email or password');
  }

  res.cookie(AUTH_COOKIE, signToken(user._id), cookieOptions());
  res.json({ user: user.toPublic() });
}

// POST /api/auth/logout
export function logout(req, res) {
  const { maxAge, ...opts } = cookieOptions(); // eslint-disable-line no-unused-vars
  res.clearCookie(AUTH_COOKIE, opts);
  res.json({ message: 'Logged out' });
}

// GET /api/auth/me — lets the React app ask "who is logged in?" on page load
export function me(req, res) {
  res.json({ user: req.user ? req.user.toPublic() : null });
}
