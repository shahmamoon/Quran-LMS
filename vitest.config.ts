import { defineConfig } from 'vitest/config';

// Unit tests for backend logic (e.g. the payment webhook state machine).
// Scoped to *.test.ts under server/ so it never picks up the Playwright E2E
// specs in tests/ (those are *.spec.ts run by `npm test`).
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    environment: 'node',
  },
});
