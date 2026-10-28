import { createApp } from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';
import { assertRequiredConfig } from '../server/src/config/env.js';

let appPromise;

export default async function handler(req, res) {
  try {
    appPromise ??= (async () => {
      assertRequiredConfig();
      await connectDB();
      return createApp();
    })();

    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    appPromise = undefined;
    console.error(error);
    return res.status(500).json({ error: 'Server initialization failed' });
  }
}