// CI config — runs public smoke tests against production (punched.me)
// Claude runs this from the sandbox. No local dev server needed.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/smoke.spec.ts', '**/landing.spec.ts', '**/join.spec.ts'],
  fullyParallel: true,
  retries: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/ci-results.json' }],
  ],
  use: {
    baseURL: 'https://punched.me',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iPhone 15',
      use: { ...devices['iPhone 15'] },
    },
  ],
});
