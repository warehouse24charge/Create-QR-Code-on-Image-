import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Relative base URL for GitHub Pages compatibility
  server: {
    port: 3000,
    open: true
  }
});
