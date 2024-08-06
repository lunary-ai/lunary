import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class HomePage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async clickSignUpBtn(): Promise<void> {
    await this.page.getByText('Sign Up').click();
  }

  
}
