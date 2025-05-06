// import { expect, test } from "@playwright/test";
// import { setOrgFree, setOrgPro } from "./utils/db";

// test.beforeAll(async () => {
//   await setOrgPro();
// });

// test.afterAll(async () => {
//   await setOrgFree();
// });

// test.describe.configure({ mode: "serial" });

// test("create new template and test basic playground", async ({ page }) => {
//   await page.goto("/prompts");

//   await page.waitForLoadState("networkidle");

//   await page.getByTestId("empty-action").click();

//   await page.getByTestId("rename-template-input").fill("first-template");
//   await page.getByTestId("rename-template-input").press("Enter");

//   await expect(page.getByText("first-template")).toBeVisible();

//   await page.waitForSelector("[data-testid=run-playground]");
//   await page.getByTestId("run-playground").click();

//   await expect(page.getByText("Hello!")).toBeVisible();
//   await expect(page.locator("#HERE").getByText("assistant")).toBeVisible();
// });

// test("create new chat template and deploy", async ({ page }) => {
//   await page.goto("/prompts");

//   await page.waitForLoadState("networkidle");

//   await page.waitForSelector("[data-testid=create-template]");
//   await page.getByTestId("create-template").click();

//   await page.getByTestId("rename-template-input").fill("test-chat-template");
//   await page.getByTestId("rename-template-input").press("Enter");

//   await page.getByTestId("deploy-template").click();

//   await expect(page.getByText("Template deployed")).toBeVisible();

//   await page.getByText("Hi!").click();
//   await page.getByText("Hi!").fill("This is another test");

//   await page.getByTestId("save-template").click();

//   await expect(page.locator("a").filter({ hasText: "v2" })).toBeVisible();
// });

// test("create new text template and deploy", async ({ page }) => {
//   await page.goto("/prompts");

//   await page.waitForLoadState("networkidle");

//   await page.getByTestId("create-template").click();

//   await page.getByTestId("rename-template-input").click();

//   await page.getByText("Text").click();

//   await page.getByTestId("deploy-template").click();

//   await expect(await page.getByText("Template deployed")).toBeVisible();
// });
