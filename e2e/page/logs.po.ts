import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class LogsPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async verifyThumbUpDownIsDisplayedOnBanner(): Promise<void> {
    await expect(this.page.locator("//*[contains(@class,'thumb-up')and contains(@fill,'color-gray')]").first()).toBeVisible()
    await expect(this.page.locator("//*[contains(@class,'thumb-down') and contains(@fill,'color-gray')]").first()).toBeVisible()
  }

  async clickMessage(message: string): Promise<void> {
    await this.page.getByText(message).click();
  }

  async clickThumbUpIcon(): Promise<void> {
    await this.page.locator("//*[contains(@class,'thumb-up')and contains(@fill,'color-gray')]").last().click()
  }

  async clickMessageIcon(): Promise<void> {
    await this.page.locator("//*[contains(@class,'tabler-icon-message') and contains(@stroke,'gray')]").click()
  }

  async sendComment(content:string): Promise<void> {
    await this.page.getByPlaceholder('Add a comment').fill(content);
    await this.page.locator('[role="dialog"] span.mantine-Button-label').filter({hasText: 'Save'}).click();
  }

  async hoverCommentIcon(message:string): Promise<void> {
    await this.page.locator("table tr").filter({hasText: message})
      .locator(`//*[contains(@fill,'color-teal-5')]`).hover();
  }

  async verifyCommentIsDisplayed(message:string, content:string): Promise<void> {
    expect(await this.page.locator('div.mantine-Tooltip-tooltip').innerText()).toContain(content);
  }

  async verifyThumbUpIconTurnGreen(): Promise<void> {
    await expect(this.page.locator("//*[contains(@class,'thumb-up') and contains(@fill,'color-green')]").last()).toBeVisible()
  }

  async verifyThumbDownIconTurnRed(): Promise<void> {
    await expect(this.page.locator("//*[contains(@class,'thumb-down') and contains(@fill,'color-red')]").last()).toBeVisible()
  }

  async verifyThumbUpIconIsDisplayed(message:string): Promise<void> {
    await expect(this.page.locator("table tr").filter({hasText: message})
      .locator(`//*[contains(@class,'thumb-up') and contains(@fill,'color-green')]`)).toBeVisible();
  }

  async verifyThumbDownIconIsDisplayed(message:string): Promise<void> {
    await expect(this.page.locator("table tr").filter({hasText: message})
    .locator(`//*[contains(@class,'thumb-down') and contains(@fill,'color-red')]`)).toBeVisible();
  }

  async clickThumbDownIcon(): Promise<void> {
    await this.page.locator("//*[contains(@class,'thumb-down')and contains(@fill,'color-gray')]").last().click()
  }

  async closeModal(): Promise<void> {
    // await this.page.locator(`[role="dialog"] button[data-variant="subtle"]`).click()
    await this.page.getByRole('banner').getByRole('button').click();
  }

  
  
}
