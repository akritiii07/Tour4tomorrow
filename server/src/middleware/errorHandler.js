import mongoose from 'mongoose';
import { config } from '../config/env.js';

// 404 for any /api route that doesn't exist.
export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express recognises an error handler by its FOUR arguments.
// Express 5 automatically forwards errors thrown inside async route handlers
// here, so controllers don't need try/catch everywhere.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  // Mongoose schema validation failed
  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }
  // Invalid ObjectId in a URL, e.g. /api/trips/not-an-id
  if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  }
  // Unique index violation (e.g. email already registered)
  if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue || { value: 1 })[0]} already in use`;
  }
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) {
    console.error('💥', err);
    // Never leak stack traces / internals to users in production.
    if (config.isProduction) message = 'Internal server error';
  }

  res.status(status).json({ error: message, ...(details ? { details } : {}) });
}
