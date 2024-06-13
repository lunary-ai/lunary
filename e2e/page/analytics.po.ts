import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class AnalyticsPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async getProjectId(): Promise<string> {
    return await this.page.locator('//code').innerText();
  }

  
}
