import { Locator, Page } from '@playwright/test';
import { CommAction } from './common.po';

export class LoginPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async login(userName: string, password: string): Promise<void> {
    await this.page.locator('input[type="email"]').fill(userName);
    await this.page.locator('span.mantine-Button-label').filter({hasText: 'Continue'}).click();
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.locator('span.mantine-Button-label').filter({hasText: 'Login'}).click();
    await this.page.locator('span.mantine-Button-label').filter({hasText: 'Login'}).waitFor({state: 'detached', timeout: 30000});
  }
}
