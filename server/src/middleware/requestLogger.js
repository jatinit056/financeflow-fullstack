import { logger } from '../utils/logger.js';

/** Logs method, path, status and duration. Never logs headers or bodies (tokens, passwords). */
export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info(
      `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(0)}ms`,
    );
  });

  next();
}
