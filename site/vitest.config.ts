import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    passWithNoTests: true,
    // Exclude Playwright E2E specs — they run via `npx playwright test`, not Vitest.
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
