import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://vooshnewsbackend.onrender.com',
        changeOrigin: true,
        secure: false, // dev-only: allow proxying even if cert oddities occur
        rewrite: (path) => path.replace(/^\/api/, ''), // keep if your backend routes are at root
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error('[vite-proxy] proxy error:', err && err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[vite-proxy] proxyReq -> host:', proxyReq.getHeader('host'), 'path:', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[vite-proxy] proxyRes status:', proxyRes.statusCode, 'for', req.url);
          });
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
