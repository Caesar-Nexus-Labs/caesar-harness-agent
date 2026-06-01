import { defineConfig } from 'tsup';

// CLI bundle with executable shebang; bundles workspace deps for a standalone bin.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  sourcemap: true,
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
});
