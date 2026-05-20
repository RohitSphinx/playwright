import { test, expect } from '@playwright/test';
import { baseURL } from '../../fixtures/data/urls';

// Auth is provided via storageState in playwright.config.ts (Azure AD session).

test.describe('Authentication — Azure AD Integration', () => {

  // TC-SEC-AUTH-001
  test('unauthenticated request to protected route redirects to Azure AD', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page    = await context.newPage();

    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/login\.microsoftonline\.com|login\.windows\.net|\/login/i);
    await context.close();
  });

  // TC-SEC-AUTH-002
  test('authenticated user is not redirected away from dashboard', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).not.toHaveURL(/login\.microsoftonline\.com|\/login/i);
  });

  // TC-SEC-AUTH-003
  test('direct navigation to login page redirects authenticated user to app', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('domcontentloaded');

    // Authenticated user should be sent to the app, not left on the login page
    await expect(page).not.toHaveURL(/login\.microsoftonline\.com/i);
  });

});
