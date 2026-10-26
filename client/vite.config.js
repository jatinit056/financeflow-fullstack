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
        },
      },
    },
    preview: { port: 4173 },
  };
});
