import { defineConfig } from 'tsup';

// Dual ESM+CJS build with type declarations for the core library.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
});
