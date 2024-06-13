import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class UserDetailPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async verifyUserInfo(userName: string, email: string): Promise<void> {
    await expect( this.page.locator('h4').filter({hasText: userName})).toBeVisible();
    await expect( this.page.getByRole('code').filter({hasText: email})).toBeVisible();
  }

  
}
