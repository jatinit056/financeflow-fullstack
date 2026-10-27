import axios from 'axios';

const TOKEN_KEY = 'financeflow.token';

/**
 * Where the JWT lives between visits ("persistent login").
 * Wrapped in try/catch because storage can be unavailable (private mode, blocked cookies).
 */
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // storage unavailable — the session simply won't survive a reload
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // nothing to clear
    }
  },
};

/**
 * One Axios instance for the whole app.
 * - Development: baseURL "/api" is proxied to the Express server by Vite.
 * - Production: VITE_API_URL points at the deployed API (e.g. https://….onrender.com/api).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // Free hosting tiers sleep when idle; the first request can take up to a minute.
  timeout: 75_000,
});

// Static GitHub Pages build (`npm run build:pages`): there is no server, so API calls are
// answered in the browser by src/demo/demoBackend.js. Normal builds don't include that code.
if (import.meta.env.MODE === 'pages') {
  api.defaults.adapter = (config) =>
    import('../demo/demoBackend.js').then(({ handleRequest }) => handleRequest(config));
}

// Attach the token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let unauthorizedHandler = null;

/** The auth provider registers what to do when a session dies (expired/invalid token). */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const CREDENTIAL_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/demo'];

// A 401 on any normal request means the stored token is no longer valid: log out globally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isCredentialCall = CREDENTIAL_ENDPOINTS.includes(error.config?.url);
    if (error.response?.status === 401 && !isCredentialCall && tokenStorage.get()) {
      tokenStorage.clear();
      unauthorizedHandler?.(error.response.data?.error);
    }
    return Promise.reject(error);
  },
);
