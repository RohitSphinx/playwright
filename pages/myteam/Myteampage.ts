import { Page, Locator } from '@playwright/test';

export class MyTeamPage {
  readonly page: Page;
  readonly myTeamLink: Locator;
  readonly successStoriesLink: Locator;
  readonly viewDetailLink: Locator;

  constructor(page: Page) {
    this.page               = page;
    this.myTeamLink         = page.getByRole('link', { name: 'Icon My Team', exact: true });
    this.successStoriesLink = page.getByRole('link', { name: 'Icon Success Stories' });
    this.viewDetailLink     = page.getByRole('link', { name: 'View View Detail' });
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openMyTeam() {
    await this.myTeamLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectTeamMember(name: string) {
    await this.page.getByText(name).click();
  }

  async openSuccessStories() {
    await this.successStoriesLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openFirstSuccessStory() {
    await this.page.getByRole('cell', { name: 'INN-' }).click();
    await this.page.locator('td:nth-child(9) > div').click();
    await this.viewDetailLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}