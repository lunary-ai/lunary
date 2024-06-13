import { Locator, Page, expect } from '@playwright/test';
import { CommAction } from './common.po';

export class SignUpPage extends CommAction {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async signUpAccountStep1(email: string, password: string, userName:string): Promise<void> {
    await this.page.waitForLoadState("networkidle")
    await this.page.getByPlaceholder('Your email').click();
    await this.page.getByPlaceholder('Your email').fill(email);
    await this.page.getByPlaceholder('Your full name').click();
    await this.page.getByPlaceholder('Your full name').fill(userName);
    await this.page.getByPlaceholder('Your password').click();
    await this.page.getByPlaceholder('Your password').fill(password);
    await this.page.getByRole('button', { name: 'Continue →' }).click();
  }

  async signUpAccountStep2(projectName: string, organization: string, companySize: string, option: string): Promise<void> {
    await this.page.getByPlaceholder("Your project name").click()
    await this.page.getByPlaceholder("Your project name").fill(projectName)

    await this.page.getByPlaceholder("Organization name").click()
    await this.page.getByPlaceholder("Organization name").fill(organization)
    await this.page.getByLabel(companySize).check();
    await this.page.getByPlaceholder('Select an option').click();
    await this.page.getByRole('option', { name: option }).click();
    await this.page.getByRole('button', { name: 'Create account' }).click();
  }

  async verifySignUpSuccess(): Promise<void> {
    expect( await this.page.getByRole('heading', { name: 'You\'re all set 🎉' })).toBeVisible();
  }

  async openDashboard(): Promise<void> {
    await this.page.getByRole('button', { name: 'Open Dashboard' }).click();
  }

  async clickSkipDashboard(): Promise<void> {
    await this.page.waitForNavigation()

    await expect(this.page.getByText("Are you free in the next days")).toBeVisible()
    await this.page.getByRole("button", { name: "Skip to Dashboard" }).click()
  }
  
}
