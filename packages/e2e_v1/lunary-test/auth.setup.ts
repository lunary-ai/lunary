// import { test, expect } from "@playwright/test";

// test("login via two-step flow", async ({ page }) => {
//   const EMAIL = "test@lunary.ai";
//   const PASSWORD = "testtest";

//   // 1) go to the email step
//   await page.goto("http://127.0.0.1:8080/login");
//   await expect(page).toHaveURL(/\/login/);
//   await expect(page.getByPlaceholder("Your email")).toBeVisible();

//   // 2) submit email → password step
//   await page.getByPlaceholder("Your email").fill(EMAIL);
//   await page.getByTestId("continue-button").click();
//   await expect(page.getByPlaceholder("Your password")).toBeVisible();

//   // 3) submit password → land on dashboard
//   await page.getByPlaceholder("Your password").fill(PASSWORD);
//   await page.getByTestId("continue-button").click();
//   await page.waitForURL("http://127.0.0.1:8080/dashboards*");
//   await expect(page).toHaveURL(/dashboards/);
// });
// tests/login-and-save-state.spec.ts
import { test as setup, expect } from "@playwright/test";

const authFile = ".auth/user.json"
setup("login via two-step flow & save auth state", async ({ page }) => {
  const EMAIL = "test@lunary.ai";
  const PASSWORD = "testtest";

  // 1) go to the email step
  await page.goto("http://127.0.0.1:8080/login");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByPlaceholder("Your email")).toBeVisible();

  // 2) submit email → password step
  await page.getByPlaceholder("Your email").fill(EMAIL);
  await page.getByTestId("continue-button").click();
  await expect(page.getByPlaceholder("Your password")).toBeVisible();

  // 3) submit password → land on dashboard
  await page.getByPlaceholder("Your password").fill(PASSWORD);
  await page.getByTestId("continue-button").click();
  await page.waitForURL("http://127.0.0.1:8080/dashboards*");
  await expect(page).toHaveURL(/dashboards/);
  const dashLink = page.getByRole("link", { name: "Dashboards" });
  await expect(dashLink).toBeVisible();
  // 4) Save the authenticated storage state for reuse
  await page.context().storageState({ path: authFile });
});

// import { test as setup, expect } from '@playwright/test';
// import fs from 'fs';
// import path from 'path';

// const AUTH_FILE = '.auth/user.json';
// const CREDENTIALS_FILE = '.auth/credentials.json';
// const APP_ORIGIN = 'http://127.0.0.1:8080'; // change to your actual origin if needed

// setup('Signup → Login → Save custom token', async ({ page }) => {
//   // Generate unique credentials
//   const timestamp = Date.now();
//   const EMAIL = `e2e_${timestamp}@example.com`;
//   const PASSWORD = 'secret123';
//   const NAME = 'Playwright Tester';

//   fs.mkdirSync('.auth', { recursive: true });
//   fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({ email: EMAIL, password: PASSWORD }, null, 2));

//   // Neutralize reCAPTCHA
//   await page.addInitScript(() => {
//     // @ts-ignore
//     window.grecaptcha = {
//       ready: (cb: () => void) => cb(),
//       execute: () => 'playwright-dummy-token',
//     };
//   });

//   // SIGNUP
//   await page.goto(`${APP_ORIGIN}/signup`);
//   await page.getByLabel('Email').fill(EMAIL);
//   await page.getByLabel('Name').fill(NAME);
//   await page.getByLabel('Password').fill(PASSWORD);
//   await page.getByTestId('continue-button').click();
//   await page.waitForURL(`${APP_ORIGIN}/`);

//   // LOGOUT → LOGIN (if needed)
//   await page.goto(`${APP_ORIGIN}/login`);
//   await page.getByPlaceholder('Your email').fill(EMAIL);
//   await page.getByTestId('continue-button').click();
//   await page.getByPlaceholder('Your password').fill(PASSWORD);
//   await page.getByTestId('continue-button').click();
//   await page.waitForURL(`${APP_ORIGIN}/dashboards*`);

//   // Get localStorage values
//   const localStorageData = await page.evaluate(() => {
//     const keys = Object.keys(localStorage);
//     return keys.map((key) => ({
//       name: key,
//       value: localStorage.getItem(key),
//     }));
//   });

//   // Format user.json like your expected structure
//   const authData = {
//     cookies: [],
//     origins: [
//       {
//         origin: APP_ORIGIN,
//         localStorage: localStorageData,
//       },
//     ],
//   };

//   fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));
//   console.log(`✅ Saved auth token to ${AUTH_FILE}`);
// });
