import mongoose from 'mongoose';
import { config } from './env.js';

// `sanitizeFilter` makes Mongoose strip query operators like { $gt: '' }
// that an attacker might smuggle in through JSON bodies (NoSQL injection).
mongoose.set('sanitizeFilter', true);
// Only fields defined in a schema are used in queries.
mongoose.set('strictQuery', true);

export async function connectDB() {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000, // give up after 10s instead of hanging
  });
  console.log(`✅ MongoDB connected (database: ${mongoose.connection.name})`);

  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
