import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { monthAnchorQuery } from '../../validation/common.js';
import * as controller from './dashboard.controller.js';

// Mounted at /api/dashboard behind requireAuth.
// ?year=&month= lets the client pass its *local* current month (the server runs in UTC).
const router = Router();

router.get('/', validate({ query: monthAnchorQuery }), controller.getDashboard);

export default router;
