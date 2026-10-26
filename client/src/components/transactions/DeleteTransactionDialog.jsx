import { useState } from 'react';
import { transactionsApi } from '../../api/endpoints.js';
import { categoryLabel } from '../../lib/categories.js';
import { getErrorMessage } from '../../lib/errors.js';
import { formatDate } from '../../lib/format.js';
import { useToast } from '../../toast/useToast.js';
import { Amount } from '../ui/Amount.jsx';
import { CategoryIcon } from '../ui/CategoryIcon.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';

export function DeleteTransactionDialog({ transaction, onClose, onDeleted }) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await transactionsApi.remove(transaction.id);
      toast.success('Transaction deleted.');
      onDeleted();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error), "Couldn't delete the transaction");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ConfirmDialog
      open={Boolean(transaction)}
      onClose={onClose}
      onConfirm={handleConfirm}
      loading={deleting}
      title="Delete this transaction?"
      description="This can't be undone."
      confirmLabel="Delete transaction"
    >
      {transaction && (
        <div className="flex items-center gap-3 rounded-xl border border-rule p-3">
          <CategoryIcon category={transaction.category} type={transaction.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {transaction.description || categoryLabel(transaction.category)}
            </p>
            <p className="text-sm text-ink-2">{formatDate(transaction.date)}</p>
          </div>
          <Amount value={transaction.amount} type={transaction.type} />
        </div>
      )}
    </ConfirmDialog>
  );
}
