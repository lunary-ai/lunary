import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  workers: 2,
  testDir: "./",
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "github" : "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    actionTimeout: 10 * 1000,
    navigationTimeout: 10 * 1000,

    // Uses Vercel deployment URL in CI, otherwise uses localhost.
    baseURL: process.env.CI ? process.env.BASE_URL : "http://127.0.0.1:8080",
    permissions: ["clipboard-read", "clipboard-write"],
 
    video: "on",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    { name: "setup", testMatch: "auth.setup.ts" },
    {
      // Projects related tests need to be ran before all other tests to avoid project mismatches.
      name: "projects",
      testMatch: "projects.setup.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "chromium",
      dependencies: ["setup", "projects"],
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
      },
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: /global\.teardown\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: "bun run dev",
  //   url: "http://127.0.0.1:8080",
  //   reuseExistingServer: !process.env.CI,
  // },
});

