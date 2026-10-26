import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/token.js';
import { publicUserSelect } from '../modules/auth/auth.service.js';

const userIdSchema = z.uuid();

/**
 * Require a valid "Authorization: Bearer <jwt>" header.
 *
 * 1. Verify the token's signature and expiry.
 * 2. Load the user it belongs to (so deleted accounts lose access immediately).
 * 3. Attach the user to req.user for the route handlers.
 */
export async function requireAuth(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized('Please log in to continue', 'NO_TOKEN');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized(
        'Your session has expired. Please log in again.',
        'TOKEN_EXPIRED',
      );
    }
    throw AppError.unauthorized('Invalid session. Please log in again.', 'INVALID_TOKEN');
  }

  if (!userIdSchema.safeParse(payload.sub).success) {
    throw AppError.unauthorized('Invalid session. Please log in again.', 'INVALID_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: publicUserSelect,
  });

  if (!user) {
    throw AppError.unauthorized('This account no longer exists.', 'INVALID_TOKEN');
  }

  req.user = user;
  next();
}
