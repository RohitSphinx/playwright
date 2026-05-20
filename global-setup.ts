import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const AUTH_FILE = path.resolve(__dirname, 'auth/user.json');

async function globalSetup(config: FullConfig) {
  console.log('[setup] Opening browser — please log in with your Azure account...');
  console.log('[setup] Complete login + MFA, then WAIT for the dashboard to fully load.');
  console.log('[setup] The browser will close automatically once your session is saved.');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto('https://kaizen.sphinxworldbiz.net/login');

  // Wait until we land on the dashboard — confirms full login including MFA
  await page.waitForURL(
    url => url.toString().includes('kaizen.sphinxworldbiz.net') &&
           !url.toString().includes('/login') &&
           !url.toString().includes('login.microsoftonline.com') &&
           !url.toString().includes('login.windows.net'),
    { timeout: 180_000 } // 3 minutes for MFA
  );

  // Extra wait to ensure cookies are fully set after redirect
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  console.log(`[setup] Login complete — URL: ${page.url()}`);
  console.log('[setup] Saving session...');

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });

  // Verify the saved state has cookies
  const saved = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  if (saved.cookies.length === 0 && saved.origins.length === 0) {
    console.error('[setup] WARNING: Session appears empty — login may not have completed');
  } else {
    console.log(`[setup] Session saved — ${saved.cookies.length} cookies, ${saved.origins.length} origins`);
  }

  await browser.close();
}

export default globalSetup;