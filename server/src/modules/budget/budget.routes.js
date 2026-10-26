import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as controller from './budget.controller.js';
import { budgetBodySchema, budgetQuerySchema } from './budget.schemas.js';

// Mounted at /api/budget behind requireAuth.
const router = Router();

router.get('/', validate({ query: budgetQuerySchema }), controller.getOverview);
router.post('/', validate({ body: budgetBodySchema }), controller.create);
router.put('/', validate({ body: budgetBodySchema }), controller.update);

export default router;
