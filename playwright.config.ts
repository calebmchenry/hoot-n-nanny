import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        viewport: {
          width: 375,
          height: 667,
        },
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://localhost:4173/hoot-n-nanny/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
