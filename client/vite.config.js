import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/** "/financeflow-fullstack" -> "/financeflow-fullstack/", "" -> "/" */
const asBasePath = (path) => {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
};

/**
 * GitHub Pages has no SPA rewrites: a deep link such as /financeflow-fullstack/budget would 404.
 * Publishing index.html as 404.html lets the app load anyway, and the router shows the page.
 */
function githubPagesSpaFallback() {
  let outDir;
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // `--mode pages`: static demo for GitHub Pages, with the API running in the browser.
  const pages = mode === 'pages';

  return {
    // A project site lives at /<repository>/; the deploy workflow passes the exact path.
    base: pages ? asBasePath(process.env.PAGES_BASE_PATH ?? '/financeflow-fullstack/') : '/',
    plugins: [react(), tailwindcss(), pages && githubPagesSpaFallback()],
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
