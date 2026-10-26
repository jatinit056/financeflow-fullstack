import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

export function createAuthRouter({ limiters }) {
  const router = Router();

  router.post('/register', limiters.auth, validate({ body: registerSchema }), controller.register);
  router.post('/login', limiters.auth, validate({ body: loginSchema }), controller.login);
  router.post('/demo', limiters.demo, controller.demo);
  router.get('/me', requireAuth, controller.me);

  return router;
}
