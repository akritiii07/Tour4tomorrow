// ─────────────────────────────────────────────────────────────────────────────
// The backend as a Vercel serverless function (used by /api/index.js).
//
// Locally, server.js starts a normal long-running Express server.
// On Vercel there is no long-running server: each request runs a function.
// This wraps the SAME Express app the local server uses, adding one step:
// make sure MongoDB is connected before any route runs.
//
// Why export an Express app (not a plain `async function handler`)?
// For plain functions Vercel adds its own "helpers" that read the request body
// first, which can break express.json(). An Express app is passed through untouched.
// ─────────────────────────────────────────────────────────────────────────────
import express from 'express';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { assertRequiredConfig } from './config/env.js';

const app = express();
app.disable('x-powered-by');

app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next(); // works even if the DB is down
  try {
    assertRequiredConfig();
    await connectDB(); // reuses one connection per warm instance (see config/db.js)
    next();
  } catch (err) {
    console.error('Startup error:', err.message);
    res.status(503).json({
      error: err.message.includes('Missing required environment variables')
        ? 'Server is missing MONGODB_URI or JWT_SECRET. Add them in Vercel → Settings → Environment Variables, then redeploy.'
        : 'Could not connect to the database. Check MONGODB_URI and that Atlas Network Access allows 0.0.0.0/0.',
    });
  }
});

app.use(createApp());

export default app;
