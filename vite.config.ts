import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Fix: Import process to get correct types for process.cwd()
import process from 'process';

export default defineConfig(({ mode }) => {
  // Load env files
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: './', // Critical for Capacitor
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      emptyOutDir: true,
    },
    server: {
      host: true,
      port: 5173,
    },
    publicDir: 'public',
  };
});