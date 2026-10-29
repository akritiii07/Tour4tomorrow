import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server PROXIES every /api request to the Express backend.
// Why? The browser then thinks the API is on the same origin as the React app
// (localhost:5173), so the auth cookie "just works" and there are no CORS issues
// during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
