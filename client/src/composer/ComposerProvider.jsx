import { useCallback, useEffect, useMemo, useState } from 'react';
import { TransactionModal } from '../components/transactions/TransactionModal.jsx';
import { ComposerContext } from './ComposerContext.js';

const isTypingTarget = (element) =>
  element instanceof HTMLElement &&
  Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));

export function ComposerProvider({ children }) {
  const [composer, setComposer] = useState({ open: false, transaction: null });
  const [dataVersion, setDataVersion] = useState(0);

  const openCreate = useCallback(() => setComposer({ open: true, transaction: null }), []);
  const openEdit = useCallback((transaction) => setComposer({ open: true, transaction }), []);
  const close = useCallback(() => setComposer((current) => ({ ...current, open: false })), []);
  const notifyChange = useCallback(() => setDataVersion((version) => version + 1), []);

  // Keyboard shortcut: "N" opens the add-transaction modal (unless the user is typing).
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      openCreate();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openCreate]);

  const value = useMemo(
    () => ({ openCreate, openEdit, notifyChange, dataVersion }),
    [openCreate, openEdit, notifyChange, dataVersion],
  );

  return (
    <ComposerContext value={value}>
      {children}
      <TransactionModal
        open={composer.open}
        transaction={composer.transaction}
        onClose={close}
        onSaved={notifyChange}
      />
    </ComposerContext>
  );
}
