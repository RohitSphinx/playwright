import { test, expect } from '@playwright/test';
import { baseURL } from '../../fixtures/data/urls';

// Auth is provided via storageState in playwright.config.ts (Azure AD session).
// Tests inject XSS payloads into authenticated app inputs — not the Azure login form.

const xssPayloads = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  "'><svg onload=alert(1)>",
  'javascript:alert(1)',
  '<iframe src="javascript:alert(1)">',
] as const;

test.describe('Cross-Site Scripting (XSS) Security', () => {

  // TC-SEC-XSS-001
  test('XSS payload in search input does not execute script', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    let dialogFired = false;
    page.on('dialog', async dialog => {
      dialogFired = true;
      await dialog.dismiss();
    });

    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search/i)
    ).first();

    const hasSearch = await searchInput.isVisible().catch(() => false);
    if (!hasSearch) {
      test.skip();
      return;
    }

    for (const payload of xssPayloads) {
      await searchInput.fill(payload);
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
      expect(dialogFired, `XSS dialog fired for payload: ${payload}`).toBe(false);
    }
  });

  // TC-SEC-XSS-002
  test('XSS payload in URL query param is not reflected as executable script', async ({ page }) => {
    let dialogFired = false;
    page.on('dialog', async dialog => {
      dialogFired = true;
      await dialog.dismiss();
    });

    for (const payload of xssPayloads) {
      await page.goto(`${baseURL}?q=${encodeURIComponent(payload)}`);
      await page.waitForLoadState('networkidle');

      expect(dialogFired, `XSS dialog fired for payload: ${payload}`).toBe(false);

      const content = await page.content();
      // Payload must be encoded in the DOM, not rendered as raw HTML
      expect(content).not.toContain('<script>alert("xss")</script>');
    }
  });

  // TC-SEC-XSS-003
  test('XSS payload in visible text inputs does not execute script', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    let dialogFired = false;
    page.on('dialog', async dialog => {
      dialogFired = true;
      await dialog.dismiss();
    });

    const inputs = page.locator('input[type="text"], input[type="search"], textarea').first();
    const visible = await inputs.isVisible().catch(() => false);

    if (!visible) {
      test.skip();
      return;
    }

    await inputs.fill('<script>alert("xss")</script>');
    await page.keyboard.press('Tab');

    await expect(page.locator('script:has-text("alert")')).toHaveCount(0);
    expect(dialogFired).toBe(false);
  });

});
