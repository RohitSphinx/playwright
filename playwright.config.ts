import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

export default defineConfig({

  testDir: './tests',

  globalSetup: './global-setup.ts',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  timeout: 60 * 1000,

  expect: {
    timeout: 10000,
  },

  metadata: {

    projectName:
      process.env.PROJECT_NAME ||
      'HMEL Plus Security Automation',

    environment:
      process.env.TEST_ENV || 'UAT',

    executionType:
      process.env.CI ? 'CI/CD' : 'Local',

    browser:
      process.env.BROWSER || 'chromium',

    executedAt:
      new Date().toISOString(),

    baseURL:
      process.env.BASE_URL,
  },

  reporter: [

    // Console Reporter
    ['list'],

    // HTML Report
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: 'never',
      },
    ],

    // Standard JSON Report
    [
      'json',
      {
        outputFile: 'test-results/results.json',
      },
    ],

    // JUnit XML Report
    [
      'junit',
      {
        outputFile: 'test-results/results.xml',
      },
    ],

    // Custom Enriched JSON Report
    [
      './reporters/custom-json-reporter.ts',
    ],
  ],

  outputDir: 'test-results/artifacts',

  use: {

    baseURL: process.env.BASE_URL,

    // Run headless in CI/CD
    headless: !!process.env.CI,

    // Azure AD authenticated session
    storageState: 'auth/user.json',

    trace: 'retain-on-failure',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',

    actionTimeout: 15000,

    navigationTimeout: 30000,

    ignoreHTTPSErrors: true,

    viewport: {
      width: 1440,
      height: 900,
    },
  },

  projects: [

    {
      name: 'chromium',

      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Future Browser Expansion
    /*
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    */
  ],

});