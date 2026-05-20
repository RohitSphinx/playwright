import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

const BASE_URL = process.env.BASE_URL!;
const AUTH_FILE = path.resolve(
  __dirname,
  'auth/user.json'
);

/**
 * Configurable Headless Mode
 *
 * Priority:
 * 1. HEADLESS env variable
 * 2. CI environment
 * 3. default = false
 */
const HEADLESS =
  process.env.HEADLESS !== undefined
    ? process.env.HEADLESS === 'true'
    : !!process.env.CI;

async function globalSetup(config: FullConfig) {

  console.log(
    `[setup] Browser Mode: ${
      HEADLESS ? 'HEADLESS' : 'HEADED'
    }`
  );

  console.log(
    '[setup] Opening browser — please log in with your Azure account...'
  );

  console.log(
    '[setup] Complete login + MFA, then WAIT for the dashboard to fully load.'
  );

  console.log(
    '[setup] The browser will close automatically once your session is saved.'
  );

  const browser = await chromium.launch({

    headless: HEADLESS,

  });

  const context = await browser.newContext();

  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);

  // Wait until redirected back from Azure login
  const appHost = new URL(BASE_URL).hostname;

  await page.waitForURL(

    url =>
      url.toString().includes(appHost) &&
      !url.toString().includes('/login') &&
      !url.toString().includes(
        'login.microsoftonline.com'
      ) &&
      !url.toString().includes(
        'login.windows.net'
      ),

    {
      timeout: 180_000,
    }
  );

  // Ensure cookies/session fully established
  await page.waitForLoadState(
    'domcontentloaded'
  );

  await page.waitForTimeout(2000);

  console.log(
    `[setup] Login complete — URL: ${page.url()}`
  );

  console.log(
    '[setup] Saving session...'
  );

  fs.mkdirSync(
    path.dirname(AUTH_FILE),
    { recursive: true }
  );

  await context.storageState({
    path: AUTH_FILE,
  });

  // Validate saved auth state
  const saved = JSON.parse(
    fs.readFileSync(
      AUTH_FILE,
      'utf-8'
    )
  );

  if (
    saved.cookies.length === 0 &&
    saved.origins.length === 0
  ) {

    console.error(
      '[setup] WARNING: Session appears empty — login may not have completed'
    );

  } else {

    console.log(
      `[setup] Session saved — ` +
      `${saved.cookies.length} cookies, ` +
      `${saved.origins.length} origins`
    );
  }

  await browser.close();
}

export default globalSetup;