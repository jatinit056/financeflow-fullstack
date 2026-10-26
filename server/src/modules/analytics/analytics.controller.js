import { currentYearMonth } from '../../utils/dates.js';
import * as service from './analytics.service.js';

export async function getAnalytics(req, res) {
  const { year, month, months } = req.validated.query;
  const anchor = year && month ? { year, month } : currentYearMonth();
  res.json(await service.getAnalytics(req.user.id, { anchor, months }));
}
