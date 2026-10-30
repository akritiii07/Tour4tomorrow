// Loads environment variables from server/.env and exposes ONE config object.
// Every other file imports `config` instead of reading process.env directly,
// so all settings (and their defaults) live in a single place.
import 'dotenv/config';

const isTest = process.env.NODE_ENV === 'test';

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  mongoUri: process.env.MONGODB_URI,

  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-secret-only-for-tests' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSameSite: ['lax', 'strict', 'none'].includes(process.env.COOKIE_SAMESITE)
    ? process.env.COOKIE_SAMESITE
    : 'lax',
  // Vercel sets VERCEL=1 automatically on its servers.
  isVercel: Boolean(process.env.VERCEL),

  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
    geminiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
  },

  orsKey: process.env.ORS_API_KEY || '',
  nominatimUserAgent:
    process.env.NOMINATIM_USER_AGENT || 'Tour4Tomorrow-student-project/1.0',

  dailyPointsCap: Number(process.env.DAILY_POINTS_CAP) || 100,
};

// Fail fast: it is much easier to debug "JWT_SECRET is missing" at startup
// than a confusing crash the first time someone logs in.
export function assertRequiredConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy server/.env.example to server/.env and fill them in.'
    );
  }
  if (config.jwtSecret.length < 32) {
    console.warn('⚠️  JWT_SECRET is shorter than 32 characters. Use a long random value.');
  }
}
