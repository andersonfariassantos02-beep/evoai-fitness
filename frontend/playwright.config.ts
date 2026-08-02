import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173', // Porta padrão do Vite
    trace: 'retain-on-failure',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Desktop',
      use: { 
        viewport: { width: 1440, height: 900 },
        userAgent: 'Desktop'
      },
    },
    {
      name: 'Mobile Padrão',
      use: { 
        viewport: { width: 390, height: 844 },
        userAgent: 'Mobile',
        hasTouch: true
      },
    },
    {
      name: 'Mobile Compacto',
      use: { 
        viewport: { width: 375, height: 667 },
        userAgent: 'MobileCompact',
        hasTouch: true
      },
    },
  ],
});