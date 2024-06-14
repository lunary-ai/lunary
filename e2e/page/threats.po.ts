import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class ThreatsPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }
  async clickTagName(tag : string): Promise<void> {
    await this.page.getByText(tag).click();
  }

  async clickViewTraceButton(): Promise<void> {
    await this.page.getByRole('button', { name: 'View trace' }).click();
    await this.page.waitForLoadState("networkidle")
  }
  
  
}
