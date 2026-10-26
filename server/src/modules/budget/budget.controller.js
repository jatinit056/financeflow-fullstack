import * as service from './budget.service.js';
import { currentYearMonth } from '../../utils/dates.js';

const anchorFrom = (query) =>
  query.year && query.month ? { year: query.year, month: query.month } : currentYearMonth();

export async function getOverview(req, res) {
  res.json(await service.getBudgetOverview(req.user.id, anchorFrom(req.validated.query)));
}

export async function create(req, res) {
  const budget = await service.createBudget(req.user.id, req.validated.body);
  res.status(201).json({ budget });
}

export async function update(req, res) {
  const budget = await service.updateBudget(req.user.id, req.validated.body);
  res.json({ budget });
}
