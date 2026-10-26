import { useEffect, useEffectEvent, useState } from 'react';
import { isCancelled } from '../lib/errors.js';

/**
 * Fetch data for a component and re-fetch whenever `deps` change.
 *
 *   const { data, error, loading, reload } = useApi((signal) => api.get(..., signal), [page]);
 *
 * - Stale requests are cancelled with an AbortController (no race conditions when
 *   filters change quickly).
 * - While re-fetching, the previous `data` is kept so the UI can stay on screen
 *   (dimmed) instead of flashing a skeleton.
 */
export function useApi(fetcher, deps) {
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${JSON.stringify(deps)}#${reloadCount}`;
  const [result, setResult] = useState({ key: null, data: undefined, error: null });

  const runFetcher = useEffectEvent((signal) => fetcher(signal));

  useEffect(() => {
    const controller = new AbortController();

    runFetcher(controller.signal).then(
      (data) => setResult({ key: requestKey, data, error: null }),
      (error) => {
        if (controller.signal.aborted || isCancelled(error)) return;
        setResult((previous) => ({ key: requestKey, data: previous.data, error }));
      },
    );

    return () => controller.abort();
  }, [requestKey]);

  const settled = result.key === requestKey;

  return {
    data: result.data,
    error: settled ? result.error : null,
    loading: !settled,
    initialLoading: !settled && result.data === undefined,
    reload: () => setReloadCount((count) => count + 1),
  };
}
