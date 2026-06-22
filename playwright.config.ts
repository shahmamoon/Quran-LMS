import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,       // run sequentially — shared DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 2,
  workers: 1,                  // single worker — avoid race conditions on shared DB
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  // LMSLayout renders <h1>{pageTitle}</h1> in the TopBar AND each page renders
  // its own <h1>, so getByRole('heading') finds two identical elements and
  // Playwright strict-mode fails immediately. Fix: always scope heading checks
  // to page.locator('main'). This timeout is a safety net for slow CI.
  expect: { timeout: 10_000 },

  projects: [
    // Setup project — logs in and saves auth state for each role
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },

    // Main test project — reuses saved auth state
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  // Assumes `npm run dev` is already running
  webServer: [
    {
      command: 'npm run dev:client',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: 'npm run dev:server',
      url: 'http://localhost:4000/api/settings/public',
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],
});
