import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: [
      { find: '@shared/errors', replacement: require.resolve('@shared/errors') },
      { find: '@shared', replacement: path.resolve(__dirname, './src/shared') },
      { find: '@modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
