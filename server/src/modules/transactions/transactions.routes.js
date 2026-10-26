import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { uuidParam } from '../../validation/common.js';
import * as controller from './transactions.controller.js';
import {
  exportQuerySchema,
  listQuerySchema,
  transactionBodySchema,
} from './transactions.schemas.js';

// Mounted at /api/transactions behind requireAuth, so req.user is always set here.
const router = Router();

router.get('/', validate({ query: listQuerySchema }), controller.list);
router.post('/', validate({ body: transactionBodySchema }), controller.create);
// Must come before "/:id" so "export" is not treated as an id.
router.get('/export', validate({ query: exportQuerySchema }), controller.exportCsv);
router.get('/:id', validate({ params: uuidParam }), controller.getOne);
router.put('/:id', validate({ params: uuidParam, body: transactionBodySchema }), controller.update);
router.delete('/:id', validate({ params: uuidParam }), controller.remove);

export default router;
