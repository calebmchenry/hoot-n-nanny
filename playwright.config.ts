import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    {
      name: 'mobile-small',
      use: {
        viewport: {
          width: 375,
          height: 667,
        },
      },
    },
    {
      name: 'mobile-large',
      use: {
        viewport: {
          width: 393,
          height: 852,
        },
      },
    },
    {
      name: 'tablet',
      use: {
        viewport: {
          width: 768,
          height: 1024,
        },
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: {
          width: 1920,
          height: 1080,
        },
      },
    },
    {
      name: 'phone-landscape',
      use: {
        viewport: {
          width: 667,
          height: 375,
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
