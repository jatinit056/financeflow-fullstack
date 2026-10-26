import { use } from 'react';
import { ComposerContext } from './ComposerContext.js';

/**
 * Open the add/edit transaction modal from anywhere, and react to saved changes:
 * pages include `dataVersion` in their fetch dependencies so they refresh after a save.
 */
export function useComposer() {
  const composer = use(ComposerContext);
  if (!composer) throw new Error('useComposer must be used inside <ComposerProvider>');
  return composer;
}
