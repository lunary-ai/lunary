import {
  expect,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  test,
} from "@playwright/test";
import { setOrgPro } from "./utils/db";
import fs from "fs";

test.describe.configure({ mode: "serial" });

let publicLogUrl: string;

test("make a log public", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/logs");
  await page.waitForLoadState("networkidle");

  await page.getByText("xyzTESTxyz").click();

  await page.getByTestId("selected-run-menu").click();
  await page.getByTestId("toggle-run-visibility").click();

  publicLogUrl = await page.evaluate(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const selected = urlParams.get("selected");
    return `${window.location.origin}/logs/${selected}`;
  });
});

test("test export csv", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(msg);
  });
  await setOrgPro();

  await page.goto("/logs?type=llm");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-csv-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  const expectedHeaders = [
    "id",
    "projectId",
    "isPublic",
    "feedback",
    "parentFeedback",
    "type",
    "name",
    "createdAt",
    "endedAt",
    "duration",
    "templateVersionId",
    "templateSlug",
    "cost",
    "tokens",
    "tags",
    "input",
    "output",
    "error",
    "status",
    "siblingRunId",
    "params",
    "metadata",
    "user",
    "traceId",
    "scores",
  ];
  const actualHeaderLine = content.split("\n")[0].trim();
  expect(actualHeaderLine).toBe(`"${expectedHeaders.join('","')}"`);

  // TODO: check that the content of each column for each row is correct (use json-2-csv to convert the csv to json
  // TODO: do the same thing for threads and traces (do not forget to check that children has the right)
});

// TODO: test export-raw-jsonl-button and export-openai-jsonl-button

test("unauthenticated user can access public log URL", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(publicLogUrl);
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("xyzTESTxyz")).toBeVisible();

  await context.close();
});
