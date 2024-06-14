import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class LogsPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async closeModal(): Promise<void> {
    // await this.page.locator(`[role="dialog"] button[data-variant="subtle"]`).click()
    await this.page.getByRole('banner').getByRole('button').click();
  }

  
  
}
