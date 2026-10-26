import { rateLimit } from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/**
 * Rate limiters are created per app instance (not module-level singletons) so each test
 * app starts with a clean counter and rate limiting can be switched on or off per instance.
 */
export function createRateLimiters({ enabled }) {
  const make = (options) =>
    rateLimit({
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: () => !enabled,
      handler: (_req, res, _next, opts) => {
        res.status(opts.statusCode).json({
          error: { code: 'RATE_LIMITED', message: opts.message },
        });
      },
      ...options,
    });

  return {
    // Generous ceiling for all API traffic from one IP.
    api: make({
      windowMs: FIFTEEN_MINUTES,
      limit: 500,
      message: 'Too many requests. Please slow down and try again in a few minutes.',
    }),

    // Brute-force protection: only failed login/register attempts count.
    auth: make({
      windowMs: FIFTEEN_MINUTES,
      limit: 10,
      skipSuccessfulRequests: true,
      message: 'Too many failed attempts. Please wait 15 minutes and try again.',
    }),

    // Each demo session creates a sandbox user, so cap them per IP.
    demo: make({
      windowMs: ONE_HOUR,
      limit: 10,
      message: 'Too many demo sessions from your network. Please try again later.',
    }),
  };
}
