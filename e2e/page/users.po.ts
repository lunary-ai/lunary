import { Locator, Page } from '@playwright/test';
import { CommAction } from './common.po';

export class UserPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async searchUser(userName: string): Promise<void> {
    await this.page.locator('#search').fill(userName);
  }

  async clickUserName(userName: string): Promise<void> {
    await this.page.locator('table p').filter({hasText: userName}).click();
  }
}
