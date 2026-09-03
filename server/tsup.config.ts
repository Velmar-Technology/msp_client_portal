import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'shared/db/migrate': 'src/shared/db/migrate.ts',
  },
  outDir: 'dist',
  format: ['cjs'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  bundle: true,
  noExternal: ['@shared/contracts', '@shared/errors'],
  skipNodeModulesBundle: true,
  shims: true,
});
