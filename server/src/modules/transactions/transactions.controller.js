import * as service from './transactions.service.js';
import { todayString } from '../../utils/dates.js';

export async function list(req, res) {
  res.json(await service.listTransactions(req.user.id, req.validated.query));
}

export async function getOne(req, res) {
  const transaction = await service.getTransaction(req.user.id, req.validated.params.id);
  res.json({ transaction });
}

export async function create(req, res) {
  const result = await service.createTransaction(req.user.id, req.validated.body);
  res.status(201).json(result);
}

export async function update(req, res) {
  const result = await service.updateTransaction(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  res.json(result);
}

export async function remove(req, res) {
  await service.deleteTransaction(req.user.id, req.validated.params.id);
  res.status(204).end();
}

export async function exportCsv(req, res) {
  const csv = await service.exportTransactionsCsv(req.user.id, req.validated.query);
  res
    .status(200)
    .type('text/csv; charset=utf-8')
    .attachment(`financeflow-transactions-${todayString()}.csv`)
    .send(csv);
}
