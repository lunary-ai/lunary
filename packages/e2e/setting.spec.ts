// tests/project-settings.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Project Settings', () => {
  /* -----------------------------------------------------------
     Adjust this helper if your app needs an authenticated state.
  ----------------------------------------------------------- */
  test.beforeEach(async ({ page }) => {
    // Example if you’re using stored auth state:
    // await page.context().addCookies([ ... ]);
    await page.goto('/settings');
  });

  /* ===========================================================
     TC-01  Update project name
  =========================================================== */
  test('Update project name', async ({ page }) => {
    const projectNameInput = page.getByTestId('project-name-input');
    await expect(projectNameInput).toBeVisible();

    const originalName = await projectNameInput.inputValue();
    const newName = 'Project #1';

    await projectNameInput.fill(newName);
    await expect(projectNameInput).toHaveValue(newName);

    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Re-load to confirm persistence
    await page.reload();
    await expect(projectNameInput).toHaveValue(newName);

    // ─── Clean-up (restore original) ─────────────────────────
    if (originalName !== newName) {
      await projectNameInput.fill(originalName);
      await saveBtn.click();
    }
  });

  /* ===========================================================
     TC-02  Verify Monthly Project Usage is displayed
     (Assumes the project already has tracked events this month)
  =========================================================== */
  test('Monthly project usage displays activity', async ({ page }) => {
    const usageHeading = page.getByRole('heading', {
      name: 'Monthly Project Usage',
    });

    const usageSection = usageHeading.locator('..'); // parent container
    await expect(usageSection).toBeVisible();

    // Fail early if “No data available” stub still shows
    const noDataStub = usageSection.getByText(
      'No data available for this period',
      { exact: true }
    );

    if (await noDataStub.isVisible()) {
      throw new Error(
        '❌ Monthly usage still shows “No data available” despite pre-condition of existing events.'
      );
    }

    // Confirm numeric event count > 0 (change selector to your markup)
    const eventsCount = usageSection.getByTestId('usage-events-count');
    const countText = (await eventsCount.innerText()).replace(/[^\d.]/g, '');
    expect(Number(countText)).toBeGreaterThan(0);
  });

  /* ===========================================================
     TC-03  Verify Project ID / Public Key is visible & copyable
  =========================================================== */
  test('Project ID / Public key is visible and copyable', async ({ page }) => {
    // Clipboard permission for headed / WebKit runs
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    const idValue = page.getByTestId('project-id-value');
    const copyBtn = page.getByTestId('copy-project-id');

    await expect(idValue).toBeVisible();
    await expect(copyBtn).toBeEnabled();

    const visibleId = (await idValue.innerText()).trim();
    expect(visibleId).toMatch(/[0-9a-f-]{36}/); // UUID-v4 format

    await copyBtn.click();
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );

    expect(clipboardText.trim()).toBe(visibleId);
  });
});

/* --------------------------------------------------
     TC-04  Private key can be regenerated
  -------------------------------------------------- */
  test('Private key is regenerated and displayed', async ({ page }) => {
    const keyField   = page.getByTestId('private-key-value');   // masked value
    const regenBtn   = page.getByRole('button', { name: /regenerate/i });

    await expect(keyField).toBeVisible();
    await expect(regenBtn).toBeEnabled();

    const oldKey = (await keyField.innerText()).trim();
    expect(oldKey.length).toBeGreaterThan(0);

    // Click “Regenerate” and wait for the text to change
    await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/keys/regenerate') && r.ok()
      ), // optional: network assertion
      regenBtn.click()
    ]);

    await expect(keyField).not.toHaveText(oldKey);  // value must differ
    const newKey = (await keyField.innerText()).trim();

    expect(newKey.length).toBeGreaterThan(0);
    expect(newKey).not.toBe(oldKey);
  });

  /* --------------------------------------------------
     TC-05  Validation error on invalid project name
  -------------------------------------------------- */
  test('Error shown for invalid project name input', async ({ page }) => {
    const nameInput = page.getByTestId('project-name-input');
    const saveBtn   = page.getByRole('button', { name: 'Save' });

    await expect(nameInput).toBeVisible();

    // Invalid characters (update to match your own rules)
    await nameInput.fill('@@@###');
    await saveBtn.click();

    // Expect validation / toast message
    const errMsg = page.getByText(/invalid project name/i);
    await expect(errMsg).toBeVisible();

    // Save should remain disabled (if your UI behaves that way)
    await expect(saveBtn).toBeDisabled();
  });

  /* --------------------------------------------------
     TC-06  LLM Providers modal opens
  -------------------------------------------------- */
  test('LLM Providers configuration opens correctly', async ({ page }) => {
    const configureBtn = page.getByRole('button', { name: /configure/i, exact: false })
                             .filter({ hasText: 'LLM Providers' }); // narrow the match

    await expect(configureBtn).toBeVisible();
    await configureBtn.click();

    // Modal / drawer should appear
    const modal = page.getByRole('dialog').getByRole('heading', {
      name: /llm providers/i,
    });
    await expect(modal).toBeVisible();

    // Optional sanity check – e.g. Save button exists
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
  });

  /* ======================================================================
   TC-07  Delete Project button – destructive flow
====================================================================== */
test('Delete Project removes project and redirects', async ({ page }) => {
  const deleteBtn = page.getByRole('button', { name: /delete project/i });

  await expect(deleteBtn).toBeVisible();

  // Handle the confirmation dialog (native confirm or custom modal)
  page.once('dialog', (dialog) => dialog.accept()); // native <confirm>
  // -- If you use a custom modal:
  // await deleteBtn.click();
  // await page.getByRole('button', { name: /confirm delete/i }).click();

  // Click Delete
  await deleteBtn.click();

  // Expect redirect to projects list / landing (change target URL)
  await page.waitForURL('/projects');  // or '/'
  await expect(page).toHaveURL(/\/projects/);
});

/* ======================================================================
   TC-08  Update Organization name
====================================================================== */
test('Organization name can be updated', async ({ page }) => {
  const orgNameInput = page.getByTestId('org-name-input');
  const saveBtn      = page.getByRole('button', { name: 'Save' });

  await expect(orgNameInput).toBeVisible();

  const original = await orgNameInput.inputValue();
  const newName  = `Org ${Date.now()}`;

  await orgNameInput.fill(newName);
  await saveBtn.click();

  // Reload to verify persistence
  await page.reload();
  await expect(orgNameInput).toHaveValue(newName);

  // ═══ clean-up ═══
  await orgNameInput.fill(original);
  await saveBtn.click();
});

/* ======================================================================
   TC-09  Edit and refresh Cost Mappings
====================================================================== */
test('Cost mappings can be edited and refreshed', async ({ page }) => {
  // Open the Edit Mappings modal/pane
  const editBtn = page.getByRole('button', { name: /edit mappings/i });
  await expect(editBtn).toBeVisible();
  await editBtn.click();

  const mappingsModal = page.getByRole('dialog', {
    name: /cost mappings/i,
  });
  await expect(mappingsModal).toBeVisible();

  // Example interaction › change the first mapping value
  const firstMapInput = mappingsModal.locator('input').first();
  const newValue      = '1234';
  await firstMapInput.fill(newValue);

  // Click “Refresh Costs”
  const refreshBtn = mappingsModal.getByRole('button', {
    name: /refresh costs/i,
  });
  await expect(refreshBtn).toBeEnabled();
  await refreshBtn.click();

  // Expect a success toast / updated timestamp
  await expect(page.getByText(/costs refreshed/i)).toBeVisible();

  // Close modal
  await mappingsModal.getByRole('button', { name: /close/i }).click();
  await expect(mappingsModal).toBeHidden();
});

/* ======================================================================
   TC-10  Verify Data-Warehouse Connections → Contact Sales link
====================================================================== */

test('Enterprise › Contact Sales opens Data-Warehouse page', async ({ page }) => {
  // Org tab (enterprise plan assumed)
  await page.goto('/settings?tab=organization');

  // Locate the “Data Warehouse Connections” section
  const dwSection = page
    .getByRole('heading', { name: /data warehouse connections/i })
    .locator('..');          // parent container

  const contactSalesBtn = dwSection.getByRole('button', { name: /contact sales/i });

  await expect(contactSalesBtn).toBeVisible();
  await contactSalesBtn.click();

  // Expect redirect / modal   (update path if needed)
  await page.waitForURL(/\/sales\/data-warehouse/);
  await expect(page).toHaveURL(/\/sales\/data-warehouse/);

  // Optional: ensure the destination page loaded
  await expect(page.getByRole('heading', { name: /data warehouse connections/i })).toBeVisible();
});