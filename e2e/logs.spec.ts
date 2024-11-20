import {
  expect,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  test,
} from "@playwright/test";
import { setOrgPro } from "./utils/db";
import fs from "fs";

import { csv2json } from "json-2-csv";

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

// CSV EXPORTS
test("test export csv - llm", async ({ page }) => {
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

  const json = csv2json(content);

  expect(Object.keys(json[0])).toEqual([
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
  ]);

  // TODO: check that the content of each column for each row is correct (use json-2-csv to convert the csv to json
  // TODO: do the same thing for threads and traces (do not forget to check that children has the right)
});

// test("test export csv - trace", async ({ page }) => {
//   page.on("console", (msg) => {
//     console.log(msg);
//   });
//   await setOrgPro();

//   await page.goto("/logs?type=trace");
//   await page.waitForLoadState("networkidle");

//   const downloadPromise = page.waitForEvent("download");

//   await page.getByTestId("export-menu").click();
//   await page.getByTestId("export-csv-button").click();

//   const file = await downloadPromise;
//   const path = await file.path();
//   const content = fs.readFileSync(path, "utf-8");

//   const logs: any[] = csv2json(content);

//   console.log(logs);

//   const expectedHeaders = TRACE_HEADERS;
//   expect(Object.keys(logs[0])).toEqual(expectedHeaders);

//   const logWithChildren = logs.find(
//     (item: any) => item?.children?.length,
//   )?.children;

//   if (!logWithChildren) return;

//   expect(Object.keys(logWithChildren[0])).toEqual(expectedHeaders);
// });

test("test export csv - thread", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(msg);
  });
  await setOrgPro();

  await page.goto("/logs?type=thread");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-csv-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  const json = csv2json(content);

  expect(Object.keys(json[0])).toEqual([
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
  ]);
});

// RAW JSONL
test("test export jsonl - llm", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(msg);
  });
  await setOrgPro();

  await page.goto("/logs?type=llm");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-raw-jsonl-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  const json = JSON.parse(content.split("\n")[0]);

  expect(Object.keys(json)).toEqual([
    "id",
    "createdAt",
    "endedAt",
    "duration",
    "tags",
    "projectId",
    "status",
    "name",
    "error",
    "input",
    "output",
    "params",
    "type",
    "parentRunId",
    "promptTokens",
    "completionTokens",
    "cost",
    "externalUserId",
    "feedback",
    "isPublic",
    "templateVersionId",
    "runtime",
    "metadata",
    "totalTokens",
    "userId",
    "userExternalId",
    "userCreatedAt",
    "userLastSeen",
    "userProps",
    "templateSlug",
    "parentFeedback",
    "evaluationResults",
  ]);
});

// test("test export jsonl - trace", async ({ page }) => {
//   page.on("console", (msg) => {
//     console.log(msg);
//   });
//   await setOrgPro();

//   await page.goto("/logs?type=trace");
//   await page.waitForLoadState("networkidle");

//   const downloadPromise = page.waitForEvent("download");

//   await page.getByTestId("export-menu").click();
//   await page.getByTestId("export-csv-button").click();

//   const file = await downloadPromise;
//   const path = await file.path();
//   const content = fs.readFileSync(path, "utf-8");

//   const json = JSON.parse(content.split("\n")[0]);

//   const expectedHeaders = TRACE_HEADERS;
//   expect(Object.keys(json)).toEqual(expectedHeaders);
// });

test("test export jsonl - thread", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(msg);
  });
  await setOrgPro();

  await page.goto("/logs?type=thread");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-raw-jsonl-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  const json = JSON.parse(content.trim().split("\n")[0]);

  expect(Object.keys(json)).toEqual([
    "id",
    "createdAt",
    "endedAt",
    "duration",
    "tags",
    "projectId",
    "status",
    "name",
    "error",
    "input",
    "output",
    "params",
    "type",
    "parentRunId",
    "promptTokens",
    "completionTokens",
    "cost",
    "externalUserId",
    "feedback",
    "isPublic",
    "templateVersionId",
    "runtime",
    "metadata",
    "totalTokens",
    "userId",
    "userExternalId",
    "userCreatedAt",
    "userLastSeen",
    "userProps",
    "templateSlug",
    "parentFeedback",
    "evaluationResults",
  ]);
});

// OPENAI JSONL
test("test export openai jsonl", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(msg);
  });
  await setOrgPro();

  await page.goto("/logs?type=llm");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-openai-jsonl-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  const json: any = JSON.parse(content.trim().split("\n")[0]);

  expect(json).toEqual(
    expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: expect.any(String),
          content: expect.any(String),
        }),
      ]),
    }),
  );
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
