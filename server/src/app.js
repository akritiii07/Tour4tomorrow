// Builds the Express app (without starting it). Keeping this separate from
// server.js lets tests import the app without opening a port or a DB connection.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Needed for correct client IPs (rate limiting) behind Vercel/Render/Railway.
  if (config.isProduction || config.isVercel) app.set('trust proxy', 1);

  app.use(helmet()); // sensible security headers
  app.use(
    cors({
      origin: config.clientOrigin, // only our React app may call the API from a browser
      credentials: true, // allow the auth cookie to be sent
    })
  );
  app.use(express.json({ limit: '20kb' })); // reject huge bodies
  app.use(cookieParser());
  if (config.nodeEnv !== 'test') app.use(morgan('dev')); // request logging

  app.use('/api', apiRoutes);
  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
