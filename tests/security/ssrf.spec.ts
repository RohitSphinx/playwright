import { test, expect, request } from '@playwright/test';
import { baseURL } from '../../fixtures/data/urls';

test.describe('Server-Side Request Forgery (SSRF) Protection', () => {

  // TC-SEC-SSRF-001
  test('request with external OAST callback domain in header is not forwarded', async () => {
    const api = await request.newContext();

    const res = await api.fetch(baseURL, {
      method: 'GET',
      headers: {
        'X-Forwarded-For': 'qe8scec1v625wrg1l2zo6gg67xdq1vpoqcgz6nv.oastify.com',
      },
    });

    expect(res.status()).toBeLessThan(500);
    const body = await res.text();
    expect(body).not.toMatch(/oastify|burpcollaborator|interactsh/i);
    await api.dispose();
  });

  // TC-SEC-SSRF-002
  test('request targeting internal metadata endpoint via Referer is rejected', async () => {
    const api = await request.newContext();

    const res = await api.fetch(baseURL, {
      method: 'GET',
      headers: {
        Referer: 'http://169.254.169.254/latest/meta-data/',
      },
    });

    // Must not return cloud metadata content
    const body = await res.text();
    expect(body).not.toMatch(/ami-id|instance-id|iam\/security-credentials/i);
    await api.dispose();
  });

  // TC-SEC-SSRF-003
  test('URL parameter pointing to internal IP is not fetched by the server', async () => {
    const api = await request.newContext();

    const internalTargets = [
      'http://127.0.0.1',
      'http://169.254.169.254',
      'http://[::1]',
    ];

    for (const target of internalTargets) {
      const res = await api.get(
        `${baseURL}/api/fetch?url=${encodeURIComponent(target)}`
      ).catch(() => null);

      if (!res) continue;

      // Must not be a 200 that returns internal content
      const body = await res.text().catch(() => '');
      expect(body).not.toMatch(/root:|\/etc\/passwd|ami-id|instance-id/i);
    }

    await api.dispose();
  });

});
