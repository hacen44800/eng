import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/rules/**/*.test.ts'], globals: true, environment: 'node', testTimeout: 20000 },
});
