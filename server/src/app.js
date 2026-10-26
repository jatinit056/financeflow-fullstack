import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { createRateLimiters } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/requestLogger.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import budgetRoutes from './modules/budget/budget.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import transactionRoutes from './modules/transactions/transactions.routes.js';
import { AppError } from './utils/AppError.js';

/**
 * Builds the Express app without starting a server, so tests can drive it with Supertest.
 */
export function createApp({ rateLimitEnabled = config.RATE_LIMIT_ENABLED } = {}) {
  const app = express();

  // Behind Render/Railway's proxies: read the real client IP from X-Forwarded-For.
  if (config.TRUST_PROXY) app.set('trust proxy', config.TRUST_PROXY);

  // Security headers (CSP, HSTS, no-sniff, frame protection...). Also removes X-Powered-By.
  app.use(helmet());

  // Only the configured frontend origin(s) may call this API from a browser.
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (curl, health checks, server-to-server) are allowed;
        // browsers always send one for cross-origin calls.
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(
          AppError.forbidden('This origin is not allowed to access the API', 'CORS_REJECTED'),
        );
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 86_400,
    }),
  );

  app.use(express.json({ limit: '10kb' }));
  if (!config.isTest) app.use(requestLogger);

  // Public endpoints
  app.get('/', (_req, res) => {
    res.json({ name: 'FinanceFlow API', status: 'ok', health: '/api/health' });
  });
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  const limiters = createRateLimiters({ enabled: rateLimitEnabled });
  app.use('/api', limiters.api);

  app.use('/api/auth', createAuthRouter({ limiters }));

  // Everything below requires a valid JWT
  app.use('/api/transactions', requireAuth, transactionRoutes);
  app.use('/api/budget', requireAuth, budgetRoutes);
  app.use('/api/dashboard', requireAuth, dashboardRoutes);
  app.use('/api/analytics', requireAuth, analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
