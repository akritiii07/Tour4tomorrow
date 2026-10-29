// Entry point: check config → connect to MongoDB → start listening.
import { assertRequiredConfig, config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { aiStatus } from './services/llmService.js';

async function start() {
  try {
    assertRequiredConfig();
    await connectDB();
  } catch (err) {
    console.error(`❌ Startup failed: ${err.message}`);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    const ai = aiStatus();
    console.log(`🚀 API running on http://localhost:${config.port}/api`);
    console.log(`   CORS allowed origin: ${config.clientOrigin}`);
    console.log(`   AI chatbot: ${ai.configured ? `${ai.provider} (${ai.model})` : `NOT configured (${ai.provider} key missing)`}`);
    console.log(`   Routing: ${config.orsKey ? 'openrouteservice' : 'estimated distances (no ORS_API_KEY)'}`);
  });

  // Graceful shutdown (Ctrl+C or the host stopping the app)
  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
