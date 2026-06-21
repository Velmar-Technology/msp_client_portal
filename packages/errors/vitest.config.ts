import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    deps: {
      inline: ['react', 'react-dom', '@testing-library/react'],
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
  },
});
