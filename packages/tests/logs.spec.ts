import { expect, test } from "@playwright/test";
import fs from "fs";
import { setOrgPro } from "./utils/db";

test.describe.configure({ mode: "serial" });

let publicLogUrl: string;

test("llm calls are visible", async ({ page }) => {
  await page.goto("/logs?type=llm");
  await page.waitForLoadState("networkidle");

  const table = page.getByRole("table");
  await expect(table).toContainText("xyzTESTxyz");
});

test("traces are visible", async ({ page }) => {
  await page.goto("/logs?type=trace");
  await page.waitForLoadState("networkidle");

  const inputCell = page.locator("td.input-cell").first();
  await expect(inputCell).toContainText("ice cream");
  const outputCell = page.locator("td.output-cell").first();
  await expect(outputCell).not.toHaveText("");
});

test("threads are visible", async ({ page }) => {
  await page.goto("/logs?type=thread");
  await page.waitForLoadState("networkidle");

  const threadInputCell = page.locator("td.input-cell").first();
  await expect(threadInputCell).not.toHaveText("");
});

test("specific trace page is visible", async ({ page }) => {
  await page.goto("/logs?type=trace");
  await page.waitForLoadState("networkidle");

  const row = await page.locator("td").first();
  await row.click();
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("#trace-page");
  await expect(page.locator("#trace-page")).toBeVisible();
});

test("thread side panel is visible", async ({ page }) => {
  await page.goto("/logs?type=thread");
  await page.waitForLoadState("networkidle");

  const row = await page.locator("td").first();
  await row.click();
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("#chat-replay");
  await expect(page.locator("#chat-replay")).toBeVisible();
});

// test("make a log public", async ({ page, context }) => {
//   await context.grantPermissions(["clipboard-read", "clipboard-write"]);

//   await page.goto("/logs");
//   await page.waitForLoadState("networkidle");

//   await page.getByText("xyzTESTxyz").click();

//   await page.getByTestId("selected-run-menu").click();
//   await page.getByTestId("toggle-run-visibility").click();

//   publicLogUrl = await page.evaluate(() => {
//     const urlParams = new URLSearchParams(window.location.search);
//     const selected = urlParams.get("selected");
//     return `${window.location.origin}/logs/${selected}`;
//   });
// });

// test("test export csv", async ({ page }) => {
//   page.on("console", (msg) => {
//     console.log(msg);
//   });
//   await setOrgPro();

//   await page.goto("/logs?type=llm");
//   await page.waitForLoadState("networkidle");

//   const downloadPromise = page.waitForEvent("download");

//   await page.getByTestId("export-menu").click();
//   await page.getByTestId("export-csv-button").click();

//   const file = await downloadPromise;
//   const path = await file.path();
//   const content = fs.readFileSync(path, "utf-8");

//   const expectedHeaders = [
//     "id",
//     "projectId",
//     "isPublic",
//     "feedback",
//     "parentFeedback",
//     "feedbacks",
//     "type",
//     "name",
//     "createdAt",
//     "endedAt",
//     "duration",
//     "templateVersionId",
//     "templateSlug",
//     "cost",
//     "tokens",
//     "tags",
//     "input",
//     "output",
//     "error",
//     "status",
//     "siblingRunId",
//     "params",
//     "metadata",
//     "user",
//     "traceId",
//     "scores",
//   ];
//   const actualHeaderLine = content.split("\n")[0].trim();
//   expect(actualHeaderLine).toBe(`"${expectedHeaders.join('","')}"`);

//   // TODO: check that the content of each column for each row is correct (use json-2-csv to convert the csv to json
//   // TODO: do the same thing for threads and traces (do not forget to check that children has the right)
// });

// TODO: test export-raw-jsonl-button and export-openai-jsonl-button

// test("unauthenticated user can access public log URL", async ({ browser }) => {
//   const context = await browser.newContext();
//   const page = await context.newPage();

//   await page.goto(publicLogUrl);
//   await page.waitForLoadState("networkidle");

//   await expect(page.getByText("xyzTESTxyz")).toBeVisible();

//   await context.close();
// });
