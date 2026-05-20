import { test, expect, APIResponse } from '@playwright/test';
import { baseURL } from '../../fixtures/data/urls';

const rootURL = baseURL.endsWith('/')
  ? baseURL
  : `${baseURL}/`;

/**
 * Shared helper
 */
async function getHeaders(res: APIResponse) {
  expect(res.ok() || res.status() < 500).toBeTruthy();
  return res.headers();
}

test.describe('HTTP Response Security Headers', () => {

  // TC-SEC-RESP-HDR-001
  test('response includes clickjacking protection header (X-Frame-Options or CSP)', async ({ request }) => {

    const res = await request.get(rootURL);
    const headers = await getHeaders(res);

    const frameHeader = headers['x-frame-options'];
    const cspHeader = headers['content-security-policy'];

    test.info().annotations.push({
      type: 'security-header',
      description:
        `x-frame-options=${frameHeader ?? 'MISSING'}, ` +
        `csp=${cspHeader ? 'PRESENT' : 'MISSING'}`
    });

    expect(
      frameHeader || cspHeader,
      'Missing X-Frame-Options or Content-Security-Policy'
    ).toBeTruthy();

    if (frameHeader) {
      expect(frameHeader.toLowerCase())
        .toMatch(/deny|sameorigin/);
    }

    if (cspHeader) {
      expect(cspHeader.toLowerCase())
        .toContain('frame-ancestors');
    }
  });

  // TC-SEC-RESP-HDR-002
  test('response includes Strict-Transport-Security (HSTS) header', async ({ request }) => {

    const res = await request.get(rootURL);
    const headers = await getHeaders(res);

    const hstsHeader =
      headers['strict-transport-security'];

    test.info().annotations.push({
      type: 'security-header',
      description:
        `strict-transport-security=${hstsHeader ?? 'MISSING'}`
    });

    expect(
      hstsHeader,
      'Missing Strict-Transport-Security header'
    ).toBeTruthy();

    expect(
      hstsHeader?.toLowerCase()
    ).toContain('max-age');
  });

  // TC-SEC-RESP-HDR-003
  test('response does not expose server version via Server header', async ({ request }) => {

    const res = await request.get(rootURL);
    const headers = await getHeaders(res);

    const serverHeader = headers['server'];

    if (serverHeader) {

      test.info().annotations.push({
        type: 'server-header',
        description: serverHeader
      });

      expect(serverHeader).not.toMatch(
        /apache\/\d|nginx\/\d|iis\/\d|express/i
      );

      expect(serverHeader).not.toMatch(
        /\d+\.\d+/
      );
    }
  });
});

test.describe('Cross-Site Request Forgery (CSRF) Protection', () => {

  // TC-SEC-CSRF-001
  test('state-changing API request without session cookie is rejected', async ({ request }) => {

    const res = await request.post(
      `${rootURL}api/settings`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          theme: 'dark',
        },
      }
    );

    test.info().annotations.push({
      type: 'csrf-status',
      description: `status=${res.status()}`
    });

    expect(
      [401, 403, 422]
    ).toContain(res.status());
  });

  // TC-SEC-CSRF-002
  test('state-changing request with mismatched Origin header is rejected', async ({ request }) => {

    const res = await request.post(
      `${rootURL}api/settings`,
      {
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://attacker.example.com',
        },
        data: {
          theme: 'dark',
        },
      }
    );

    test.info().annotations.push({
      type: 'csrf-origin-status',
      description: `status=${res.status()}`
    });

    expect(
      [401, 403]
    ).toContain(res.status());
  });
});

test.describe('General Security Baseline', () => {

  // TC-SEC-BASE-001
  test('unauthenticated user is redirected to Azure AD login', async ({ browser }) => {

    const context = await browser.newContext({
      storageState: undefined,
    });

    const page = await context.newPage();

    await page.goto(rootURL, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).toHaveURL(
      /login\.microsoftonline\.com|login\.windows\.net|\/login/i
    );

    await context.close();
  });

  // TC-SEC-BASE-002
  test('app response includes required security headers', async ({ request }) => {

    const res = await request.get(rootURL);
    const headers = await getHeaders(res);

    expect(
      headers['x-frame-options'] ||
      headers['content-security-policy'],
      'App should prevent clickjacking'
    ).toBeTruthy();

    expect(
      headers['strict-transport-security'],
      'App should enforce HTTPS via HSTS'
    ).toBeTruthy();

    expect(
      headers['x-content-type-options'],
      'App should prevent MIME sniffing'
    ).toBeTruthy();
  });

  // TC-SEC-BASE-003
  test('XSS payload in visible app input is not executed', async ({ page }) => {

    await page.goto(rootURL, {
      waitUntil: 'networkidle',
    });

    let dialogFired = false;

    page.on('dialog', async dialog => {
      dialogFired = true;
      await dialog.dismiss();
    });

    const payload =
      `<img src=x onerror=alert('xss') />`;

    const inputs = page.locator(
      'input[type="text"], input[type="search"], textarea'
    );

    const count = await inputs.count();

    test.skip(
      count === 0,
      'No visible text inputs available for XSS validation'
    );

    const firstInput = inputs.first();

    await firstInput.fill(payload);

    await page.keyboard.press('Enter');

    await page.waitForTimeout(1500);

    expect(dialogFired).toBe(false);
  });
});