// A small Error subclass that carries an HTTP status code.
// Throw it anywhere:  throw new AppError(404, 'Trip not found')
// and the central error handler turns it into a JSON response.
export class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // an expected error, safe to show to the user
  }
}

// Wraps fetch() with a timeout so a slow external API can't hang a request.
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
