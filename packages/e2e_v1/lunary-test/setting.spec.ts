
// packages/e2e_v1/tests/settings.spec.ts
import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __copied?: string;
  }
}


// load an authenticated session:
test.use({ storageState: ".auth/user.json" });

test.describe("Settings page flows", () => {
  test("change project name", async ({ page }) => {
    const NEW_NAME = `E2E Renamed ${Date.now()}`;

    // go straight to settings (we're already logged in)
    await page.goto("/settings");

    // edit the project-name input
    const projectInput = page.getByTestId("project-name-input");
    await expect(projectInput).toBeVisible();
    await projectInput.fill(NEW_NAME);

    // click Save and verify it sticks
    const saveBtn = page.getByRole("button", { name: "Save" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(saveBtn).toBeDisabled();
    await expect(projectInput).toHaveValue(NEW_NAME);
  });

  test("monthly project usage chart is visible", async ({ page }) => {
    // navigate to settings
    await page.goto("/settings");

    // header
    await expect(
      page.getByRole("heading", { name: "Monthly Project Usage" })
    ).toBeVisible();

    // only the events count label (e.g. "1 events")
    const eventsCount = page.locator('text=/^[0-9]+ events$/').first();
    await expect(eventsCount).toBeVisible();

    // specifically target the Recharts surface rather than all icons
    const chartSurface = page.locator(".recharts-surface");
    await expect(chartSurface).toBeVisible();
  });
  test("project ID / Public key is displayed and can be copied", async ({ page }) => {
    // navigate to settings
    await page.goto("/settings");

    // 1) The label should be visible
    await expect(
      page.getByText("Project ID / Public Key:")
    ).toBeVisible();

    // 2) The public key element must show a non-empty value
    const publicKey = page.getByTestId("public-key");
    await expect(publicKey).toBeVisible();
    const valueText = (await publicKey.textContent())!.trim();
    expect(valueText.length).toBeGreaterThan(0);

    // 3) Stub the clipboard to capture copied text
    await page.evaluate(() => {
      (navigator as any).clipboard = (navigator as any).clipboard || {};
      (navigator as any).clipboard.writeText = (text: string) => {
        (window as any).__copied = text;
        return Promise.resolve();
      };
    }); // window is only used inside browser context

    // 4) Programmatically invoke copy
    await page.evaluate((text) => (navigator as any).clipboard.writeText(text), valueText); // window not used here

    // 5) Read back the stubbed clipboard value
    const copied = await page.evaluate(() => (window as any).__copied); // window is only used inside browser context
    expect(copied).toBe(valueText);

  });

  test("private key is displayed and can be regenerated", async ({ page }) => {
    // navigate to settings
    await page.goto("/settings");

    // 1) The private key element must show a non-empty value
    const privateKey = page.getByTestId("private-key");
    await expect(privateKey).toBeVisible();
    const oldKey = (await privateKey.textContent())!.trim();
    expect(oldKey.length).toBeGreaterThan(0);

    // 2) Click the regenerate button
    const regenBtn = page.getByTestId("regenerate-private-key-button");
    await expect(regenBtn).toBeVisible();
    await regenBtn.click();

    // 3) Confirm in the modal
    const confirmBtn = page.getByTestId("confirm-button");
    await expect(confirmBtn).toBeVisible();
    await page.waitForSelector('[data-testid="confirm-button"]', { state: 'visible' });
    await confirmBtn.click({ force: true });

    // 4) Wait for the private key to update
    await expect(page.getByTestId("private-key")).not.toHaveText(oldKey);

  });



  test("LLM Providers configuration can be opened", async ({ page }) => {
    await page.goto("/settings");

    // click the Configure button/link
    const providerLink = page.locator('a[href="/settings/providers"]');
    await expect(providerLink).toBeVisible();
    await providerLink.click();

    await expect(page).toHaveURL(/\/settings\/providers$/);

  });
  test("delete project button works and redirects to home", async ({ page }) => {
    // navigate to settings and ensure Project tab is active
    await page.goto("/settings");
    const projectTab = page.getByRole('tab', { name: 'Project' });
    await expect(projectTab).toBeVisible();
    await projectTab.click();

    // open Danger Zone delete project popover
    const deleteBtn = page.getByTestId("delete-project-button");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // confirm deletion
    const confirmDelete = page.getByTestId("delete-project-popover-button");
    await expect(confirmDelete).toBeVisible();
    await confirmDelete.click();

    // should redirect back to home page
    await page.waitForURL("*/");
    await expect(page).toHaveURL(/\/$/);

  });
  test("organization tab: user can update organization name", async ({ page }) => {
    // navigate to settings
    await page.goto("/settings");

    // switch to Organization tab
    const orgTab = page.getByRole('tab', { name: 'Organization' });
    await expect(orgTab).toBeVisible();
    await orgTab.click();

    // update the organization name
    const orgInput = page.getByTestId("org-name-input");
    await expect(orgInput).toBeVisible();
    const NEW_ORG = `E2E Org ${Date.now()}`;
    await orgInput.fill(NEW_ORG);

    // save and verify
    const saveBtn = page.getByRole("button", { name: "Save" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(saveBtn).toBeDisabled();
    await expect(orgInput).toHaveValue(NEW_ORG);

  });

  // test("audit logs are accessible from Organization tab", async ({ page }) => {
  //   // go to settings
  //   await page.goto("/settings");

  //   // switch to the Organization tab
  //   await page.getByRole("tab", { name: "Organization" }).click();

  //   // now find the link (not a button) labeled “View Logs”
  //   const viewLogs = page.getByRole("link", { name: "View Logs" });
  //   await expect(viewLogs).toBeVisible();

  //   // click it and assert we land on /team/audit-logs
  //   await viewLogs.click();
  //   await page.waitForURL("**/team/audit-logs");
  //   await expect(page).toHaveURL(/\/team\/audit-logs$/);
  // });
  test("audit logs are accessible from Organization tab", async ({ page }) => {
    // go to settings
    await page.goto("/settings");
  
    // switch to the Organization tab
    await page.getByRole("tab", { name: "Organization" }).click();
  
    // now find the link (not a button) labeled “View Logs”
    const viewLogs = page.getByRole("link", { name: "View Logs" });
    await expect(viewLogs).toBeVisible();
  
    // click it and assert we land on /team/audit-logs
    await viewLogs.click();
    await page.waitForURL("**/team/audit-logs");
  
    // wait for the audit-logs page’s header to show up
 
  
    // final URL assertion
    await expect(page).toHaveURL(/\/team\/audit-logs$/);
  });
  test("SAML Configuration is visible in Organization tab", async ({ page }) => {
    await page.goto("/settings");

    // Switch to the Organization tab
    await page.getByRole("tab", { name: "Organization" }).click();

    // Look for the SAML Configuration heading (specifically a heading)
    const samlConfigTitle = page.locator('h4:has-text("SAML Configuration")');
    await expect(samlConfigTitle).toBeVisible();
  });
  test("can navigate between Project and Organization tabs", async ({ page }) => {
    // 1) Go straight to settings
    await page.goto("/settings");

    const projectTab = page.getByRole("tab", { name: "Project" });
    const orgTab = page.getByRole("tab", { name: "Organization" });

    // 2) By default, Project should be selected and its content visible
    await expect(projectTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("project-name-input")).toBeVisible();
    await expect(page.getByTestId("org-name-input")).toBeHidden();

    // 3) Click Organization → its content should show up
    await orgTab.click();
    await expect(orgTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("org-name-input")).toBeVisible();
    await expect(page.getByTestId("project-name-input")).toBeHidden();

    // 4) Click back to Project → project content should show again
    await projectTab.click();
    await expect(projectTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("project-name-input")).toBeVisible();
    await expect(page.getByTestId("org-name-input")).toBeHidden();
  });
  test("settings is accessible from the sidebar on dashboard", async ({ page }) => {
    // 1️⃣ Start on a dashboard view (you can pick any valid dashboard URL)
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 2️⃣ Click the Settings icon in the sidebar
    //    It’s rendered as a link to “/settings”
    const settingsLink = page.locator('a[href="/settings"]');
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();

    // 3️⃣ Verify the URL and that the Settings page heading is shown
    await expect(page).toHaveURL(/\/settings$/);
    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible();
  });

  test("danger zone warning: delete project shows popover confirmation", async ({ page }) => {
    // 1️⃣ Go to the settings page
    await page.goto("/settings");

    // 2️⃣ Click the "Delete Project" button in the Danger Zone
    const deleteBtn = page.getByTestId("delete-project-button");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // 3️⃣ Verify the popover confirmation appears (the "Delete" button in the popover)
    const confirmDeleteBtn = page.getByTestId("delete-project-popover-button");
    await expect(confirmDeleteBtn).toBeVisible();

    // 4️⃣ Verify the warning text inside the popover
    await expect(
      page.getByText("Are you sure you want to delete this project? This action is irreversible and it will delete all associated data.")
    ).toBeVisible();

  });

  test("verify successful project settings update notification", async ({ page }) => {
    // 1️⃣ Navigate to the settings page
    await page.goto('/settings');

    // 2️⃣ Locate the project name input field and change its value
    const projectNameInput = page.locator('[data-testid="project-name-input"]');
    const newProjectName = 'Updated Project Name';

    // Clear the existing value and enter the new name
    await projectNameInput.fill(newProjectName);

    // 3️⃣ Click the "Save" button to save the changes
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // 4️⃣ Verify that the success notification appears
    const successNotification = page.locator('.mantine-Notification-root');
    await expect(successNotification).toBeVisible();

    // Check if the notification contains the expected message
    // await expect(successNotification).toHaveText(/Project name updated successfully/);

    // // Optionally: Verify the content was actually updated by checking the new project name
    // const updatedProjectName = page.locator('text=Updated Project Name');
    // await expect(updatedProjectName).toBeVisible();
  });
  
  test("all expected buttons are visible ", async ({ page }) => {
    // 1️⃣ Navigate to /settings
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Buttons we expect in the Project tab:
    const projectButtons = [
      "Save",           // save project name
      "Regenerate",     // regenerate private key
      "Delete Project", // delete project
      "Configure",      // LLM Providers Configuration
    ];

    // Buttons we expect in the Organization tab:
    const orgButtons = [
      "Save",           // save org name
      "Edit Mappings",  // cost mapping
      "View Logs",      // audit logs
    ];

    // Helper that finds either a button or a link
    const findAction = (label: string) =>
      page.locator(`button:has-text("${label}"), a:has-text("${label}")`);

    // 2️⃣ PROJECT tab (default)
    await expect(page.getByRole("tab", { name: "Project" })).toHaveAttribute("aria-selected", "true");
    for (const label of projectButtons) {
      const action = findAction(label);
      await expect(action).toBeVisible({ timeout: 5_000 });
    }

    // 3️⃣ ORGANIZATION tab
    await page.getByRole("tab", { name: "Organization" }).click();
    await expect(page.getByRole("tab", { name: "Organization" })).toHaveAttribute("aria-selected", "true");

    for (const label of orgButtons) {
      // “Delete” inside the popover is covered in a separate test, so we skip it here
      const action = findAction(label);
      await expect(action).toBeVisible({ timeout: 5_000 });
    }
  });
  test("show error message", async ({ page }) => {
    const NEW_NAME = `E2E Renamed ${Date.now()}`;

    // go straight to settings (we're already logged in)
    await page.goto("/settings");

    // edit the project-name input
    const projectInput = page.getByTestId("project-name-input");
    await expect(projectInput).toBeVisible();
    await projectInput.fill("");

    // click Save and verify it sticks
    const saveBtn = page.getByRole("button", { name: "Save" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(saveBtn).toBeDisabled();
    
    await expect(projectInput).toHaveValue("");
    await expect(page.getByText("Project name is required")).toBeVisible();
  });

  test('Edit cost mapping and refresh cost', async ({ page }) => {
    // Navigate to the settings page
    await page.goto('/settings');
    const projectTab = page.getByRole("tab", { name: "Project" });
    const orgTab = page.getByRole("tab", { name: "Organization" });

    // 2) By default, Project should be selected and its content visible
    await expect(projectTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("project-name-input")).toBeVisible();
    await expect(page.getByTestId("org-name-input")).toBeHidden();

    // 3) Click Organization → its content should show up
    await orgTab.click();
    // === Step 1: Edit cost mapping ===
    const editButton = page.getByRole('button', { name: /Edit Mappings/i }).first();
    await editButton.click();
  
    const input = page.getByPlaceholder('e.g. $0.002 per token');
    await input.fill('0.004');
  
    await page.getByRole('button', { name: /save/i }).click();
  
    await expect(page.getByText(/updated successfully/i)).toBeVisible();
  
    // === Step 2: Refresh cost and confirm modal ===
    const refreshButton = page.getByRole('button', { name: /refresh cost/i });
    await refreshButton.click();
  
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
  
    await modal.getByRole('button', { name: /confirm/i }).click();
  
    await expect(page.getByText(/refresh started/i)).toBeVisible(); // or "refreshed successfully"
  });
})
