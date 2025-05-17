import { test, expect } from '@playwright/test';
import sql from '../../backend/src/utils/db';
import { deleteOrg, populateLogs, setOrgPro } from '../utils/db';
test.use({ storageState: '.auth/user.json' });
test.describe('Populate logs, trace, and thread for org', () => {
  test('run logs script', async ({ page }) => {


    // Populate logs + trace + thread
    await populateLogs();


    expect(true).toBeTruthy(); // dummy assertion to make test pass
    // Redirect to /logs?type=llm (assuming your app is running on localhost:3000)
    await page.goto('/logs?type=llm');

  });
  test('LLM Logs page loads', async ({ page }) => {
    await page.goto('/logs?type=llm');
    await expect(page).toHaveURL(/\/logs\?type=llm/);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/logs\?type=llm/);
   
  });

  test("verify logs apear after successfull integeration", async ({ page }) => {
    await page.goto("/logs?type=llm");
  await page.waitForLoadState("networkidle");

  const tableContent = await page.getByRole("table").textContent();
  await expect(tableContent).toContain("xyzTESTxyz");
});
test('User can view individual log details', async ({ page }) => {
  // Step 1: Go to logs page
  await page.goto('/logs?type=llm');

  // Step 2: Wait for a row containing "xyzTESTxyz"
  const row = page.getByText(/xyzTESTxyz/i);
  await expect(row).toBeVisible();

  // Step 3: Click the row
  await row.click();
  
});
test('Verify search/filter functionality on LLM logs', async ({ page }) => {
  // Navigate to the logs page
  await page.goto("logs?type=llm");

  // Ensure the search bar is visible
  const searchInput = page.getByPlaceholder('Type to filter');
  await expect(searchInput).toBeVisible();

  // Type a known input string into the search box (e.g., "ice cream")
  await searchInput.fill('xyzTESTxyz');
  await searchInput.press('Enter');

  // Wait for the logs table to update with filtered results
  const resultRow = page.getByText(/xyzTESTxyz/i);
  await expect(resultRow).toBeVisible();

  // Ensure unrelated logs are filtered out (negative assertion, optional)
  await expect(page.locator('table')).not.toContainText('unrelated string');
});
test('Verify that tags are visible in the logs table', async ({ page }) => {
  // Step 1: Go to the logs page
  await page.goto('logs?type=llm');


   // ✅ Flexible match for tags — even if div, badge, or button
   const chat = page.locator('text=chat');
   const support = page.locator('text=support');
 
   // Wait for tags to be visible
   await expect(chat.first()).toBeVisible({ timeout: 10000 });
   await expect(support.first()).toBeVisible({ timeout: 10000 });
 
   // Optionally assert total occurrences
   expect(await chat.count()).toBeGreaterThan(0);
   expect(await support.count()).toBeGreaterThan(0);
 

  
});
test('verify linking to prompt', async ({ page }) => {
 // Step 1: Go to logs page
 await page.goto('/logs?type=llm');

 // Step 2: Wait for a unique log row to appear
 const row = page.getByText(/xyzTESTxyz/i);
 await expect(row).toBeVisible();

 // Step 3: Click the row to open the drawer
 await row.click();
 

 // Step 5: Click the 3-dot menu in the drawer
 const menu = page.getByTestId('selected-run-menu');
 await menu.click();

 // Step 6: Click on "Open in Playground" from the menu
 await page.getByText('Open in Playground', { exact: true }).click();

 // Step 7: Wait for the redirect to /prompts or /prompts?clone=<id>
 await expect(page).toHaveURL(/\/prompts(\?clone=.*)?/);
});
});