import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const ISSUER = 'financeflow-api';
const AUDIENCE = 'financeflow-client';

/**
 * Issue a signed JWT for a user. The payload only carries the user id ("sub");
 * everything else is loaded fresh from the database on each request.
 */
export function signToken(userId, { expiresIn = config.JWT_EXPIRES_IN } = {}) {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: userId,
    algorithm: 'HS256',
    expiresIn,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

/** Verify signature, algorithm, expiry, issuer and audience. Throws on any problem. */
export function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}
