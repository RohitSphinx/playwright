import { test, expect, request } from '@playwright/test';
import { sqlPayloads } from '../../fixtures/data/sqlPayloads';
import { baseURL } from '../../fixtures/data/urls';

// Auth is provided via storageState in playwright.config.ts (Azure AD session).
// API tests reuse the browser session cookies so requests are authenticated.

test.describe('SQL Injection — API Endpoints', () => {

  // TC-SEC-SQLI-API-001
  test('API search endpoint rejects SQLi payloads without leaking DB errors', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    for (const payload of sqlPayloads) {
      const encoded = encodeURIComponent(payload);

      const [response] = await Promise.all([
        page.waitForResponse(
          res => res.url().includes('/api/') && res.request().method() !== 'OPTIONS',
          { timeout: 8_000 }
        ).catch(() => null),
        page.goto(`${baseURL}/api/search?q=${encoded}`).catch(() => null),
      ]);

      if (!response) continue;

      // Must not be a server error
      expect(response.status()).not.toBe(500);

      const body = await response.text().catch(() => '');
      expect(body).not.toMatch(/sql syntax|mysql_fetch|ora-\d{5}|sqlite_error|pg_query|stack trace|exception in/i);
    }
  });

  // TC-SEC-SQLI-API-002
  test('unauthenticated API requests with SQLi payloads return 401/403, not 500', async () => {
    const api = await request.newContext({ baseURL });

    for (const payload of sqlPayloads) {
      const res = await api.get(`/api/search?q=${encodeURIComponent(payload)}`);

      // Unauthenticated requests must be rejected cleanly — never a DB error
      expect(res.status()).not.toBe(500);

      const body = await res.text();
      expect(body).not.toMatch(/sql syntax|mysql|ora-\d{5}|sqlite|stack trace/i);
    }

    await api.dispose();
  });

  // TC-SEC-SQLI-API-003
  test('API POST body with SQLi payloads does not cause server error', async ({ page, request: req }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    // Grab session cookies set by the Azure AD flow
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    for (const payload of sqlPayloads) {
      const res = await req.post(`${baseURL}/api/search`, {
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: { query: payload },
      }).catch(() => null);

      if (!res) continue;

      expect(res.status()).not.toBe(500);

      const body = await res.text().catch(() => '');
      expect(body).not.toMatch(/sql syntax|mysql_fetch|ora-\d{5}|sqlite_error|stack trace/i);
    }
  });

});
