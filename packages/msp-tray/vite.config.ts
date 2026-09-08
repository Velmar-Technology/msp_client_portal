import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const clientReactPlugin = path.resolve(__dirname, '../../client/node_modules/@vitejs/plugin-react/dist/index.js');
const react = fs.existsSync(clientReactPlugin)
  ? (await import(pathToFileURL(clientReactPlugin).href)).default
  : (await import('@vitejs/plugin-react')).default;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    target: process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
