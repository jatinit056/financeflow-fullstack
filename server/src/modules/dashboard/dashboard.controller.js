import { currentYearMonth } from '../../utils/dates.js';
import * as service from './dashboard.service.js';

export async function getDashboard(req, res) {
  const { year, month } = req.validated.query;
  const anchor = year && month ? { year, month } : currentYearMonth();
  res.json(await service.getDashboard(req.user.id, anchor));
}
