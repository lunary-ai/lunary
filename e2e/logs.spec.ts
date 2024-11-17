import {
  expect,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  test,
} from "@playwright/test";

test.describe.configure({ mode: "serial" });

let publicLogUrl: string;

function exportTest(buttonID: string) {
  return async ({ page }: PlaywrightTestArgs) => {
    const contentPromise = new Promise((resolve, reject) => {
      page.on("download", async (download) => {
        const stream = await download.createReadStream();
        const chunks: string[] = [];

        stream.on("readable", () => {
          let chunk;
          while (null !== (chunk = stream.read())) {
            chunks.push(chunk);
          }
        });

        stream.on("end", () => resolve(chunks.join("")));
        stream.on("error", reject);
      });
    });

    await page.goto("/logs?type=trace");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("export-menu").click();
    await page.getByTestId(buttonID).click();

    await contentPromise;
  };
}

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

test("test export csv", exportTest("export-csv-button"));
test("test export jsonl", exportTest("export-raw-jsonl-button"));
test("test export ojsonl", exportTest("export-openai-jsonl-button"));

test("unauthenticated user can access public log URL", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(publicLogUrl);
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("xyzTESTxyz")).toBeVisible();

  await context.close();
});
