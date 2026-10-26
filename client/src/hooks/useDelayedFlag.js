import { useEffect, useState } from 'react';

/**
 * True once `active` has stayed true for `delay` ms. Used to explain slow first requests
 * ("the server is waking up") without flashing a message on fast ones.
 */
export function useDelayedFlag(active, delay = 4000) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => setElapsed(true), delay);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, delay]);

  return active && elapsed;
}
