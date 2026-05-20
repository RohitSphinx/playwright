import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL!;

test.describe('MLSP Performance Tests', () => {

  // 🔹 Measure only the public landing page speed
  test('Public homepage should load under 3 seconds', async ({ page }) => {
    const start = Date.now();

    await page.goto(baseURL, {
      waitUntil: 'domcontentloaded'   // lighter + correct for homepage
    });

    const loadTime = Date.now() - start;

    console.log(`Public homepage load time: ${loadTime} ms`);

    expect(loadTime).toBeLessThan(3000);
  });


  // 🔹 Login modal responsiveness test
  test('Login modal should open under 2 seconds', async ({ page }) => {
    await page.goto(baseURL);

    const start = Date.now();

    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('input', { timeout: 10000 });

    const loadTime = Date.now() - start;

    console.log(`Login modal load time: ${loadTime} ms`);

    expect(loadTime).toBeLessThan(2000);
  });


  // 🔹 Appointment modal performance after login
  test('Appointment modal should open quickly after login', async ({ page }) => {
    await page.goto(baseURL);

    // Login
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: /Email/i }).fill('balkrushna.s@sphinxworldbiz.com');
    await page.getByRole('textbox', { name: /Password/i }).fill('Pass@123');
    await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

    // Wait for dashboard
    await expect(page.getByRole('button', { name: 'Book an Appointment' }))
      .toBeVisible({ timeout: 15000 });

    const start = Date.now();

    await page.getByRole('button', { name: 'Book an Appointment' }).click();

    const duration = Date.now() - start;

    console.log(`Appointment modal load time: ${duration} ms`);

    expect(duration).toBeLessThan(2000);
  });

});
