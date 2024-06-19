import { Locator, Page } from '@playwright/test';
import { CommAction } from './common.po';

export class RequestResetPasswordPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async inputEmail(email: string): Promise<void> {
    await this.page.getByPlaceholder('Your email').fill(email);
    await this.page.locator(`span.mantine-Button-label`).filter({hasText: 'Submit'}).click();
  }
}
