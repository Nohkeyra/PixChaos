import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'process';

export default defineConfig(({ mode }) => {
  // Load env files
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: './', // Critical for Capacitor and AppsGeyser
    define: {
      // CRITICAL: We must define specific keys. Defining 'process.env' as an object breaks the API_KEY replacement.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // Disable source maps for production
      emptyOutDir: true,
    },
    server: {
      host: true,
      port: 5173,
    },
    publicDir: 'public',
  };
});