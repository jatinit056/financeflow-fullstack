import { transactionsApi } from '../../api/endpoints.js';
import { formatCurrency, monthName } from '../../lib/format.js';
import { useToast } from '../../toast/useToast.js';
import { Modal } from '../ui/Modal.jsx';
import { TransactionForm } from './TransactionForm.jsx';

function budgetAlertToast(alert) {
  const month = monthName(alert.month);
  if (alert.status === 'exceeded') {
    return {
      title: `Over your ${month} budget`,
      message: `You've spent ${formatCurrency(alert.spent)} of your ${formatCurrency(alert.budget)} budget.`,
    };
  }
  return {
    title: `Close to your ${month} budget`,
    message: `You've used ${Math.round(alert.percentUsed)}% of your ${formatCurrency(alert.budget)} budget.`,
  };
}

export function TransactionModal({ open, transaction, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(transaction);

  async function handleSubmit(values) {
    const result = isEdit
      ? await transactionsApi.update(transaction.id, values)
      : await transactionsApi.create(values);

    toast.success(isEdit ? 'Changes saved.' : 'Transaction added.');
    if (result.budgetAlert) {
      const { title, message } = budgetAlertToast(result.budgetAlert);
      toast.warning(message, title);
    }
    onSaved(result.transaction);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit transaction' : 'Add transaction'}
      description={isEdit ? undefined : 'Log money coming in or going out.'}
    >
      <TransactionForm
        initial={transaction}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel={isEdit ? 'Save changes' : 'Add transaction'}
      />
    </Modal>
  );
}
