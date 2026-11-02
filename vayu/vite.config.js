import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: '/vayu/',
  build: { rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), v2: fileURLToPath(new URL('./v2/index.html', import.meta.url)) } } }
});
