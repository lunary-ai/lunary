import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class DatasetPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async clickNewChatDatasetBtn(): Promise<void> {
    await this.page.getByRole('button', { name: 'New Dataset' }).click();
    await this.page.getByRole('menuitem', { name: 'New Chat Dataset (OpenAI' }).click();
  }

  async clickNewDatasetBtn(): Promise<void> {
    await this.page.getByRole('button', { name: 'New Dataset' }).click();
    await this.page.getByRole('menuitem', { name: 'New Text Dataset' }).click();
  }

  async renameDataset(name: string): Promise<void> {
    await this.page.waitForTimeout(1000);
    await this.page.locator("//*[contains(@class,'tabler-icon-pencil')]").first().click();
    await this.page.getByTestId('rename-input').waitFor({state: "visible"});
    await this.page.getByTestId('rename-input').fill(name);
    await this.page.keyboard.press('Enter');
  }

  async createChatDataset(name: string): Promise<void> {
    await this.page.waitForTimeout(1000);
    await this.page.locator("//*[contains(@class,'tabler-icon-pencil')]").first().click();
    await this.page.getByTestId('rename-input').waitFor({state: "visible"});
    await this.page.getByTestId('rename-input').fill(name);
    await this.page.keyboard.press('Enter');
  }
  
  async verifyDatasetNameIsDisplayed(name: string): Promise<void> {
    await this.page.locator('h3.mantine-Title-root').filter({hasText: name}).waitFor({timeout: 60000});
    await expect(this.page.locator('h3.mantine-Title-root').filter({hasText: name})).toBeVisible();
  }

  async verifyDatasetNameIsNotDisplayed(name: string): Promise<void> {
    await expect(this.page.locator('h3.mantine-Title-root').filter({hasText: name})).toBeHidden();
  }

  async deleteDatasetIcon(name: string): Promise<void> {
    await this.page.locator(`//h3[contains(text(),'${name}')]/ancestor::div[contains(@class,'mantine-Card-root')]//button`).first().click();
    await this.page.getByRole('heading', { name: 'Please confirm your action' }).click();
    await this.page.getByText('Are you sure you want to').click();
    await this.page.getByRole('button', { name: 'Confirm' }).click();
  }

  async clickBackBtn(): Promise<void> {
    await this.page.getByRole('link', { name: '← Back' }).click();
  }

  async inputPrompt(content: string): Promise<void> {
    await this.page.getByTestId('prompt-text-editor').fill(content);
  }
  
  
}
