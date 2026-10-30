import mongoose from 'mongoose';
import { config } from './env.js';

// `sanitizeFilter` makes Mongoose strip query operators like { $gt: '' }
// that an attacker might smuggle in through JSON bodies (NoSQL injection).
mongoose.set('sanitizeFilter', true);
// Only fields defined in a schema are used in queries.
mongoose.set('strictQuery', true);

mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));

// On Vercel the code runs as a serverless function: there is no long-running
// server, and the same warm instance handles many requests. We remember the
// connection PROMISE so every request reuses one connection instead of
// opening a new one each time (which would quickly hit Atlas's connection limit).
let connectionPromise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(config.mongoUri, {
        serverSelectionTimeoutMS: 10000, // give up after 10s instead of hanging
        maxPoolSize: 5, // small pool: serverless instances are many but short-lived
      })
      .then((m) => {
        console.log(`✅ MongoDB connected (database: ${m.connection.name})`);
        return m.connection;
      })
      .catch((err) => {
        connectionPromise = null; // let the next request try again
        throw err;
      });
  }
  return connectionPromise;
}

export async function disconnectDB() {
  await mongoose.connection.close();
  connectionPromise = null;
}
