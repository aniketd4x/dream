import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || process.cwd(), './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: ['**/Resto/**', '**/dishgaze main/**', '**/menu-scan-view-main/**'],
    },
  },
});
