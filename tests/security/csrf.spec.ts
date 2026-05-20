import { test, expect } from '@playwright/test';
import { baseURL } from '../../fixtures/data/urls';

const rootURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;

// Auth is provided via storageState in playwright.config.ts (Azure AD session).

test.describe('Cross-Site Request Forgery (CSRF) Protection', () => {

  // TC-SEC-CSRF-001
  test('state-changing API request without session cookie is rejected', async ({ request }) => {
    const res = await request.post(`${rootURL}api/settings`, {
      headers: { 'Content-Type': 'application/json' },
      // No session cookie — simulates a cross-origin forged request
      data: { theme: 'dark' },
    });

    expect([401, 403, 422]).toContain(res.status());
  });

  // TC-SEC-CSRF-002
  test('state-changing request with mismatched Origin header is rejected', async ({ request }) => {
    const res = await request.post(`${rootURL}api/settings`, {
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://attacker.example.com',
      },
      data: { theme: 'dark' },
    });

    // Should be rejected — not silently accepted from a foreign origin
    expect([401, 403]).toContain(res.status());
  });

});
