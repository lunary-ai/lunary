import {
  expect,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  test,
} from "@playwright/test";
import { setOrgFree, setOrgPro } from "./utils/db";
import fs from "fs";

import { csv2json } from "json-2-csv";

test.describe.configure({ mode: "serial" });

let publicLogUrl: string;

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    console.log(msg);
  });
});

test.beforeAll(async () => {
  await setOrgPro();
});

test.afterAll(async () => {
  await setOrgFree();
});

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
test("test export csv for llm", async ({ page }) => {
  await page.goto("/logs?type=llm");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-csv-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  expect(csv2json(content)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        cost: expect.anything(),
        createdAt: expect.any(String),
        duration: expect.any(String),
        endedAt: expect.any(String),
        error: expect.any(String),
        feedback: expect.any(String),
        id: expect.any(String),
        input: expect.anything(),
        isPublic: expect.any(Boolean),
        metadata: expect.anything(),
        name: expect.any(String),
        output: expect.anything(),
        parentFeedback: expect.any(String),
        params: expect.anything(),
        projectId: expect.any(String),
        scores: expect.anything(),
        siblingRunId: expect.any(String),
        status: expect.any(String),
        tags: expect.anything(),
        templateSlug: expect.any(String),
        templateVersionId: expect.any(String),
        tokens: expect.anything(),
        traceId: expect.any(String),
        type: expect.any(String),
        user: expect.anything(),
      }),
    ]),
  );
});

test("test export csv for trace", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(msg);
  });

  await page.goto("/logs?type=trace");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-csv-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  const logs: any[] = csv2json(content);

  console.log(logs);

  expect(Object.keys(logs)).toEqual([]);
});

test("test export csv for thread", async ({ page }) => {
  await page.goto("/logs?type=thread");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-csv-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  expect(csv2json(content)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        cost: expect.anything(),
        createdAt: expect.any(String),
        duration: expect.any(String),
        endedAt: expect.any(String),
        error: expect.any(String),
        feedback: expect.any(String),
        id: expect.any(String),
        input: expect.anything(),
        isPublic: expect.any(Boolean),
        metadata: expect.anything(),
        name: expect.any(String),
        output: expect.anything(),
        parentFeedback: expect.any(String),
        params: expect.anything(),
        projectId: expect.any(String),
        scores: expect.anything(),
        siblingRunId: expect.any(String),
        status: expect.any(String),
        tags: expect.anything(),
        templateSlug: expect.any(String),
        templateVersionId: expect.any(String),
        tokens: expect.anything(),
        traceId: expect.any(String),
        type: expect.any(String),
        user: expect.anything(),
      }),
    ]),
  );
});

// RAW JSONL
test("test export jsonl for llm", async ({ page }) => {
  await page.goto("/logs?type=llm");
  await page.waitForLoadState("networkidle");

  const downloadPromise = page.waitForEvent("download");

  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-raw-jsonl-button").click();

  const file = await downloadPromise;
  const path = await file.path();
  const content = fs.readFileSync(path, "utf-8");

  const json = content
    .split("\n")
    .filter(Boolean)
    .map((chunk) => JSON.parse(chunk));

  expect(Object.keys(json[0])).toEqual([
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

  expect(json[0]).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      createdAt: expect.any(String),
      endedAt: expect.any(String),
      duration: expect.any(String),
      tags: expect.any(Array),
      projectId: expect.any(String),
      status: expect.any(String),
      name: expect.any(String),
      error: expect.anything(),
      input: expect.anything(),
      output: expect.anything(),
      params: expect.anything(),
      type: expect.any(String),
      parentRunId: expect.any(String),
      promptTokens: expect.any(Number),
      completionTokens: expect.any(Number),
      cost: expect.anything(),
      externalUserId: expect.anything(),
      feedback: expect.anything(),
      isPublic: expect.any(Boolean),
      templateVersionId: expect.anything(),
      runtime: expect.anything(),
      metadata: expect.anything(),
      totalTokens: expect.any(Number),
      userId: expect.anything(),
      userExternalId: expect.anything(),
      userCreatedAt: expect.anything(),
      userLastSeen: expect.anything(),
      userProps: expect.anything(),
      templateSlug: expect.anything(),
      parentFeedback: expect.anything(),
      evaluationResults: expect.any(Array),
    }),
  );
});

// test("test export jsonl for trace", async ({ page }) => {
//   page.on("console", (msg) => {
//     console.log(msg);
//   });
//
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

test("test export jsonl for thread", async ({ page }) => {
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
