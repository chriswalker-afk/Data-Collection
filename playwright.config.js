import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  // Bound CI diagnostic runs so a browser regression cannot block review indefinitely.
  globalTimeout: process.env.CI ? 240000 : 0,
  maxFailures: process.env.CI ? 6 : 0,
  workers: process.env.CI ? 2 : undefined,
  expect: { timeout: 7000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }
  ],
  webServer: [
    {
      command: 'python3 -m http.server 4173 --bind 127.0.0.1',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 20000
    },
    {
      command: 'npx wrangler dev --config multiplayer/wrangler.jsonc --ip 127.0.0.1 --port 8787',
      url: 'http://127.0.0.1:8787/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000
    }
  ]
});
