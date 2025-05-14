import { test, expect } from '@playwright/test';
test.describe('Signup page', () => {
  // test('user can create an account with email + password', async ({ page }) => {
  //   /* 1️⃣ neutralise Google reCAPTCHA (cloud mode only) */
  //   await page.addInitScript(() => {
  //     // @ts-ignore
  //     window.grecaptcha = {
  //       ready: (cb: () => void) => cb(),
  //       execute: () => 'playwright-dummy-token',
  //     };
  //   });

  //   /* 2️⃣ open the real signup URL */
  //   await page.goto('http://localhost:8080/signup');

  //   /* 3️⃣ fill the form */
  //   // const uniqueEmail = `e2e_${Date.now()}@example.com`;
  //   await page.getByLabel('Email').fill("lunary123@gmail.com");
  //   await page.getByLabel('Name').fill('Playwright Tester');
  //   await page.getByLabel('Password').fill('secret123');
    
  //   /* 4️⃣ submit */
  //   const createBtn = page.getByTestId('continue-button');
  //   await expect(createBtn).toBeEnabled();
  //   await createBtn.click();

  //   /* 5️⃣ expect redirect to home/dashboard */
  //   await page.waitForURL('http://localhost:8080/', { timeout: 15_000 });
  //   await expect(page).toHaveURL('http://localhost:8080/');
  // });
  
});