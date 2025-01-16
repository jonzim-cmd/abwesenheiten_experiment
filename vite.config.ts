import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/abwesenheiten/', // Wichtig: Slash am Anfang und Ende!
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
