import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the app loads and key pages are accessible
 * after Azure login. These run first to confirm the session is valid.
 */
test.describe('Smoke', () => {

  test('app loads and user is authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Should not be redirected to Azure login
    await expect(page).not.toHaveURL(/login\.microsoftonline\.com/i);
    await expect(page).not.toHaveURL(/login\.windows\.net/i);
  });

  test('page title is correct', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/HMEL/i);
  });

  test('session expires — redirect to login', async ({ page }) => {
    // Clear cookies to simulate session expiry
    await page.context().clearCookies();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Should redirect to Azure login
    await expect(page).toHaveURL(/login\.microsoftonline\.com|login\.windows\.net|\/login/i);
  });

});