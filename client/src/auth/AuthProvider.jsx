import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { setUnauthorizedHandler, tokenStorage } from '../api/client.js';
import { authApi } from '../api/endpoints.js';
import { isCancelled } from '../lib/errors.js';
import { useToast } from '../toast/useToast.js';
import { AuthContext } from './AuthContext.js';

/**
 * Owns the logged-in user.
 *
 * status:
 *   "checking"       a token exists and is being verified with GET /auth/me (app start)
 *   "authenticated"  user is known
 *   "anonymous"      no valid session
 *   "offline"        the API could not be reached while checking — offer a retry
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState(() => ({
    status: tokenStorage.get() ? 'checking' : 'anonymous',
    user: null,
  }));
  const [checkAttempt, setCheckAttempt] = useState(0);

  // Persistent login: on start-up, turn a stored token back into a user.
  useEffect(() => {
    if (state.status !== 'checking') return undefined;
    const controller = new AbortController();

    authApi.me(controller.signal).then(
      ({ user }) => setState({ status: 'authenticated', user }),
      (error) => {
        if (isCancelled(error)) return;
        if (error.response?.status === 401) {
          tokenStorage.clear();
          setState({ status: 'anonymous', user: null });
        } else {
          setState({ status: 'offline', user: null });
        }
      },
    );

    return () => controller.abort();
    // checkAttempt lets "Try again" re-run this effect.
  }, [state.status, checkAttempt]);

  // Any 401 later on (token expired mid-session) logs the user out everywhere.
  useEffect(() => {
    setUnauthorizedHandler((apiError) => {
      setState({ status: 'anonymous', user: null });
      toast.error(apiError?.message ?? 'Your session has expired. Please log in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, [toast]);

  const startSession = useCallback(({ user, token }) => {
    tokenStorage.set(token);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const login = useCallback(
    async (credentials) => startSession(await authApi.login(credentials)),
    [startSession],
  );

  const register = useCallback(
    async (details) => startSession(await authApi.register(details)),
    [startSession],
  );

  const startDemo = useCallback(async () => startSession(await authApi.demo()), [startSession]);

  const logout = useCallback(
    ({ redirectTo = '/login', message = 'You have been logged out.' } = {}) => {
      tokenStorage.clear();
      setState({ status: 'anonymous', user: null });
      navigate(redirectTo, { replace: true });
      if (message) toast.success(message);
    },
    [navigate, toast],
  );

  const retryCheck = useCallback(() => {
    setState({ status: 'checking', user: null });
    setCheckAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, startDemo, logout, retryCheck }),
    [state, login, register, startDemo, logout, retryCheck],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
