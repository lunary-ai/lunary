import { Locator, Page } from '@playwright/test';
import lunary from "lunary"
import OpenAI from "openai"
require('dotenv').config();
import { config } from "../helpers/constants"
import { setOrgPro } from "../utils/db"
import { monitorOpenAI } from "lunary/openai"

export class CommAction{
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  async openUrl(urlPath: string): Promise<void> {
    await this.page.goto(urlPath, { timeout: 90 * 1000 });
  }

  async clickMenu(menuName: string): Promise<void> {
    await this.page.waitForLoadState("networkidle")
    await this.page.getByRole('link', { name: menuName}).click();
  }

  async initLunaryOpenAI(projectId: string): Promise<void> {
    lunary.init({
      "appId": projectId, // Your unique app ID obtained from the dashboard
      "apiUrl": config.API_URL, // Optional: Use a custom endpoint if you're self-hosting (you can also set LUNARY_API_URL)
      "verbose": true // Optional: Enable verbose logging for debugging
    })
  }

  async openAI(email: string, userName:string): Promise<void> {
    const openai = monitorOpenAI(new OpenAI({ apiKey: config.OPENAI_API_KEY}))
    const result = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.9,
    tags: ["chat", "support"],  // Optional: tags
    user: email,  // Optional: user ID
    userProps: { name: userName  },  // Optional: user properties
    messages: [
      { role: "system", content: "You are an helpful assistant" },
      { role: "user", content: "Hello friend" },
    ],
  })
  }

  
}
