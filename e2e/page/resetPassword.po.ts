import { Locator, Page } from '@playwright/test';
import { CommAction } from './common.po';

export class ResetPasswordPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async inputNewPassword(newPass: string): Promise<void> {
    await this.page.getByPlaceholder('Your new password').fill(newPass);
    await this.page.locator('span.mantine-Button-label').filter({hasText: 'Submit'}).click();
  }
}
