import { createApp } from './app.js';
import { config } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(config.PORT, (error) => {
  if (error) {
    logger.error(`Could not start the server on port ${config.PORT}`, error);
    process.exit(1);
  }
  logger.info(`FinanceFlow API listening on port ${config.PORT} (${config.NODE_ENV})`);
  logger.info(`Allowed CORS origins: ${config.corsOrigins.join(', ')}`);
});

// Graceful shutdown: stop accepting connections, finish in-flight requests, close the DB pool.
// Render/Railway send SIGTERM on every deploy.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});
