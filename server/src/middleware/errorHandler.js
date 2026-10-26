import { Prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

const send = (res, status, code, message, details) =>
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });

/** 404 for any route that is not defined. */
export function notFound(req, res) {
  send(res, 404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

/**
 * Central error handler. Express 5 forwards errors thrown in async handlers here automatically.
 * Known errors get a precise status code; anything unexpected becomes a generic 500 and is
 * logged server-side, so stack traces and SQL never reach the client.
 */
// Express recognises error handlers by their four arguments, so `_next` must stay.
export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return res.end();

  if (err instanceof AppError) {
    return send(res, err.statusCode, err.code, err.message, err.details);
  }

  // Body parser errors (malformed JSON, payload too large)
  if (err.type === 'entity.parse.failed') {
    return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  }
  if (err.type === 'entity.too.large') {
    return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  // Other client errors raised by Express/body-parser (e.g. unsupported encoding)
  if (err.expose && err.status >= 400 && err.status < 500) {
    return send(res, err.status, 'BAD_REQUEST', err.message);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return send(res, 409, 'CONFLICT', 'A record with these details already exists');
    }
    if (err.code === 'P2025') {
      const model = err.meta?.modelName ?? 'Record';
      return send(res, 404, 'NOT_FOUND', `${model} not found`);
    }
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
  return send(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}
