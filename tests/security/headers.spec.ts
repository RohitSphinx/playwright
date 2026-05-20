import { test, expect } from '@playwright/test';
import { baseURL } from '../../fixtures/data/urls';

const rootURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;

// Uses the request fixture for a direct HTTP call — avoids browser rendering
// race conditions and captures the exact headers returned by the server/CDN.

test.describe('HTTP Response Security Headers', () => {

  // TC-SEC-RESP-HDR-001
  test('response includes clickjacking protection header (X-Frame-Options or CSP)', async ({ request }) => {
    const res     = await request.get(rootURL);
    const headers = res.headers();

    const frameHeader = headers['x-frame-options'];
    const cspHeader   = headers['content-security-policy'];

    test.info().annotations.push({
      type: 'security-headers',
      description: `x-frame-options: ${frameHeader ?? 'MISSING'} | content-security-policy: ${cspHeader ? 'present' : 'MISSING'}`,
    });

    expect.soft(
      frameHeader || cspHeader,
      'Missing X-Frame-Options or Content-Security-Policy header'
    ).toBeTruthy();

    if (frameHeader) {
      expect.soft(frameHeader.toLowerCase()).toMatch(/deny|sameorigin/);
    }

    if (cspHeader) {
      expect.soft(cspHeader.toLowerCase()).toContain('frame-ancestors');
    }

    expect(test.info().errors).toHaveLength(0);
  });

  // TC-SEC-RESP-HDR-002
  test('response includes Strict-Transport-Security (HSTS) header', async ({ request }) => {
    const res        = await request.get(rootURL);
    const hstsHeader = res.headers()['strict-transport-security'];

    test.info().annotations.push({
      type: 'security-headers',
      description: `strict-transport-security: ${hstsHeader ?? 'MISSING'}`,
    });

    expect.soft(hstsHeader, 'Missing Strict-Transport-Security header').toBeTruthy();
    if (hstsHeader) {
      expect.soft(hstsHeader.toLowerCase()).toContain('max-age');
    }

    expect(test.info().errors).toHaveLength(0);
  });

  // TC-SEC-RESP-HDR-003
  test('response does not expose server version via Server header', async ({ request }) => {
    const res          = await request.get(rootURL);
    const serverHeader = res.headers()['server'];

    if (serverHeader) {
      expect(serverHeader).not.toMatch(/apache\/\d|nginx\/\d|iis\/\d|express/i);
      expect(serverHeader).not.toMatch(/\d+\.\d+/);
    }
  });

});
