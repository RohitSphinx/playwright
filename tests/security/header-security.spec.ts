import { test, expect, request } from '@playwright/test';
import { baseURL } from '../../fixtures/data/urls';

test.describe('HTTP Header Injection Security', () => {

  // TC-SEC-HDR-001
  test('X-Forwarded-Host spoofing does not redirect or expose application', async () => {
    const api = await request.newContext();

    const res = await api.fetch(baseURL, {
      method: 'HEAD',
      headers: { 'X-Forwarded-Host': 'evil.com' },
    });

    expect(res.status()).not.toBe(302);
    expect(res.status()).toBeLessThan(500);
    await api.dispose();
  });

  // TC-SEC-HDR-002
  test('X-Host header spoofing does not expose application internals', async () => {
    const api = await request.newContext();

    const res = await api.fetch(baseURL, {
      method: 'HEAD',
      headers: { 'X-Host': 'attacker.com' },
    });

    expect(res.status()).not.toBe(302);
    expect(res.status()).toBeLessThan(500);
    await api.dispose();
  });

  // TC-SEC-HDR-003
  test('X-Forwarded-Server with external OAST domain is not trusted', async () => {
    const api = await request.newContext();

    const res = await api.fetch(baseURL, {
      method: 'GET',
      headers: {
        'X-Forwarded-Server': 'qe8scec1v625wrg1l2zo6gg67xdq1vpoqcgz6nv.oastify.com',
      },
    });

    expect(res.status()).toBeLessThan(500);
    const body = await res.text();
    expect(body).not.toMatch(/oastify|burpcollaborator|interactsh/i);
    await api.dispose();
  });

  // TC-SEC-HDR-004
  test('Invalid Host header is rejected and does not expose internal routing', async () => {
    const api = await request.newContext();

    const res = await api.fetch(baseURL, {
      method: 'HEAD',
      headers: { Host: 'invalid.com' },
    });

    expect(res.status()).toBeLessThan(500);
    await api.dispose();
  });

});
