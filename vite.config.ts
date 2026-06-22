import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    ssr: {
      // react-helmet-async needs to be bundled into the SSR output.
      // All other packages (react-router-dom etc.) are left as Node externals.
      noExternal: ['react-helmet-async'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@lms': path.resolve(__dirname, './src/lms'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:4000',
          ws: true,
          changeOrigin: true,
        },
        // The blog + sitemap are server-rendered by Express, not the SPA.
        // Proxy them in dev so `pnpm dev` (Vite :3000) matches production.
        '/blog': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
        '/sitemap.xml': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
        '/quran-pages': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
        '/qaida-pages': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
