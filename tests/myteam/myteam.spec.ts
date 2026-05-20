import { test, expect } from '@playwright/test';
import { MyTeamPage } from '../../pages/myteam/MyTeamPage';
import { teamData } from '../../fixtures/data/myteam.data';

/**
 * Azure session is loaded automatically via storageState in playwright.config.ts
 * No login steps needed in these tests.
 */
test.describe('My Team', () => {

  // ─── Positive ──────────────────────────────────────────────────────────────

  test('can navigate to My Team from dashboard', async ({ page }) => {
    const myTeamPage = new MyTeamPage(page);

    await myTeamPage.goto();
    await myTeamPage.openMyTeam();

    await expect(page).not.toHaveURL(/login/i);
    await expect(page.getByText(teamData.primaryMember.name)).toBeVisible();
  });

  test('can view a team member profile', async ({ page }) => {
    const myTeamPage = new MyTeamPage(page);

    await myTeamPage.goto();
    await myTeamPage.openMyTeam();
    await myTeamPage.selectTeamMember(teamData.primaryMember.name);

    await expect(page).not.toHaveURL(/login/i);
  });

  test('can view success stories', async ({ page }) => {
    const myTeamPage = new MyTeamPage(page);

    await myTeamPage.goto();
    await myTeamPage.openSuccessStories();

    // Success stories table should be visible
    await expect(page.getByRole('cell', { name: 'INN-' })).toBeVisible();
  });

  test('can view success story detail', async ({ page }) => {
    const myTeamPage = new MyTeamPage(page);

    await myTeamPage.goto();
    await myTeamPage.openSuccessStories();
    await myTeamPage.openFirstSuccessStory();

    // Should land on detail page, not be redirected to login
    await expect(page).not.toHaveURL(/login/i);
    await expect(page).toHaveURL(/detail|view|story/i);
  });

  // ─── Negative ──────────────────────────────────────────────────────────────

  test('unauthenticated user cannot access My Team', async ({ browser }) => {
    // Fresh context with no saved session
    const context = await browser.newContext({ storageState: undefined });
    const page    = await context.newPage();

    await page.goto('https://kaizen.sphinxworldbiz.net/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Should be redirected to login
    await expect(page).toHaveURL(/login/i);
    await context.close();
  });

  test('unauthenticated user cannot access success stories directly', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page    = await context.newPage();

    await page.goto('https://kaizen.sphinxworldbiz.net/success-stories');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/login/i);
    await context.close();
  });

});