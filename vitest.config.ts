import { defineConfig } from 'vitest/config';

// Root vitest config — discovers tests across all workspace packages.
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
