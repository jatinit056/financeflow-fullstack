import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as controller from './analytics.controller.js';
import { analyticsQuerySchema } from './analytics.schemas.js';

// Mounted at /api/analytics behind requireAuth. ?months=3|6|12&year=&month=
const router = Router();

router.get('/', validate({ query: analyticsQuerySchema }), controller.getAnalytics);

export default router;
