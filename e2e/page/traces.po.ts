import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class TracesPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }
  async clickTagName(tag : string): Promise<void> {
    await this.page.getByText(tag).first().click();
  }

  
}
