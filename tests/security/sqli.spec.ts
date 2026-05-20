import { test, expect } from '@playwright/test';
import { sqlPayloads } from '../../fixtures/data/sqlPayloads';
import { baseURL } from '../../fixtures/data/urls';

// Auth is provided via storageState in playwright.config.ts (Azure AD session)

test.describe('SQL Injection — Authenticated App Inputs', () => {

  for (const payload of sqlPayloads) {

    // TC-SEC-SQLI-001
    test(`search input rejects payload: ${payload.slice(0, 40)}`, async ({ page }) => {
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/search/i)
      ).first();

      const hasSearch = await searchInput.isVisible().catch(() => false);
      if (!hasSearch) {
        test.skip();
        return;
      }

      await searchInput.fill(payload);
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');

      const content = await page.content();
      expect(content).not.toMatch(/sql syntax|mysql|ora-\d{5}|sqlite|unclosed quotation|unterminated string/i);
      await expect(page.getByRole('alert').filter({ hasText: /error/i })).toHaveCount(0);
    });

  }

  // TC-SEC-SQLI-002
  test('SQL payload in URL query param does not expose DB errors', async ({ page }) => {
    for (const payload of sqlPayloads) {
      const encoded = encodeURIComponent(payload);
      await page.goto(`${baseURL}?q=${encoded}`);
      await page.waitForLoadState('networkidle');

      const content = await page.content();
      expect(content).not.toMatch(/sql syntax|mysql_fetch|ora-\d{5}|sqlite_error|pg_query|stack trace/i);
    }
  });

  // TC-SEC-SQLI-003
  test('SQL payload in URL path segment returns safe response', async ({ page }) => {
    for (const payload of sqlPayloads) {
      const encoded = encodeURIComponent(payload);
      const response = await page.goto(`${baseURL}/${encoded}`);

      // Should return a handled response (not a 500 with DB trace)
      expect(response?.status()).not.toBe(500);

      const content = await page.content();
      expect(content).not.toMatch(/sql syntax|mysql|ora-\d{5}|sqlite|stack trace/i);
    }
  });

});
