import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // In development the app calls /api on its own origin and Vite forwards it to the
      // Express server, so no CORS setup is needed locally.
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
          // Requests arrive through this proxy, so the browser's Origin header means nothing to
          // the API here. Dropping it keeps login working when port 5173 is busy and Vite moves
          // to 5174, which is not in the API's CORS allow-list.
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
          },
        },
      },
    },
    preview: { port: 4173 },
  };
});
