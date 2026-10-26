import { use } from 'react';
import { ToastContext } from './ToastContext.js';

export function useToast() {
  const toast = use(ToastContext);
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>');
  return toast;
}
