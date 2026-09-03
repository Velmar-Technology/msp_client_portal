import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/scripts/**',
        'src/shared/db/migrations/**',
        'src/shared/db/seed*.ts',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@shared/contracts', replacement: require.resolve('@shared/contracts') },
      { find: '@shared/errors', replacement: require.resolve('@shared/errors') },
      { find: '@shared', replacement: path.resolve(__dirname, './src/shared') },
      { find: '@modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
