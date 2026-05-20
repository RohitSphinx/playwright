import { test, expect } from '@playwright/test';
import { baseURL } from '../../fixtures/data/urls';

const rootURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;

/**
 * Access Control Tests – verify that protected resources are not accessible without authentication.
 */

test.describe('Access Control', () => {
  test('protected page redirects to login when unauthenticated', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto(`${rootURL}protected`);
    await expect(page).toHaveURL(/login/i);
    await context.close();
  });
});
