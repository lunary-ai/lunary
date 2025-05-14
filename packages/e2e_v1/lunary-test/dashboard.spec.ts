import { test, expect } from "@playwright/test";

test.use({ storageState: ".auth/user.json" });

test.describe("Dashboard page", () => {
  test("loads correctly and displays main controls", async ({ page }) => {
    // 1️⃣ Start from the app root – this should redirect to your home dashboard
    await page.goto("/");

    // 2️⃣ Wait for the URL to update to /dashboards/<some-id>
    await page.waitForURL(/\/dashboards\/[^/]+$/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/dashboards\/[^/]+$/);
    
    // 3️⃣ Wait for the “Add Charts” button to appear as a sign that the dashboard UI is ready
    const addCharts = page.getByRole("button", { name: "Add Charts" });
    await expect(addCharts).toBeVisible({ timeout: 10_000 });

    // 4️⃣ Verify the “Edit” and “Save” buttons are also present
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

    // 5️⃣ And finally, ensure at least one AnalyticsCard rendered (by checking for any chart surface)
    const chartSurface = page.locator(".recharts-surface").first();
    await expect(chartSurface).toBeVisible({ timeout: 10_000 });
  });

  test("verify default dashboard is displayed", async ({ page }) => {
    // 1️⃣ Start at the app root
    await page.goto("/");
  
    // 2️⃣ It should redirect you to /dashboards/:id
    await page.waitForURL(/\/dashboards\/[^\/]+$/);
    await expect(page).toHaveURL(/\/dashboards\/[^\/]+$/);
  
    // 3️⃣ The “Add Charts” button (a unique dashboard UI element) should be visible
    const addCharts = page.getByRole("button", { name: "Add Charts" });
    await expect(addCharts).toBeVisible();
  
    // 4️⃣ And the dashboard name header should be present
    //    (we use a generic “heading” — adjust the selector if you have a better one)
    const heading = page.getByRole("heading").first();
    await expect(heading).not.toHaveText(""); // non-empty title
  });
  test("verify the ability to create a new dashboard ", async ({ page }) => {
    // 1️⃣ Start at the dashboard page
    await page.goto("/dashboards");

    // 2️⃣ Click the three-dot menu button (ActionIcon with IconDotsVertical)
    const menuButton = page.locator('[data-testid="dashboard-menu-button"]'); // This matches the ActionIcon in your code
    await menuButton.click(); // Open the dropdown menu

    // 3️⃣ Wait for the "Create new Dashboard" option to appear in the dropdown
    const createDashboardButton = page.locator('text=Create new Dashboard');
    await expect(createDashboardButton).toBeVisible(); // Ensure the "Create new Dashboard" button is visible

    // 4️⃣ Click the "Create new Dashboard" button
    await createDashboardButton.click();

    // 5️⃣ Wait for the new dashboard to be created and redirected to the new dashboard page
    await page.waitForURL(/\/dashboards\/[^/]+$/, { timeout: 10000 }); // Ensure we are redirected to the new dashboard page

    // 6️⃣ Ensure the new dashboard is visible on the new page
    const newDashboardHeading = page.getByRole("heading");
    await expect(newDashboardHeading).toBeVisible();

  });
  test('verify deleting the current dashboard', async ({ page }) => {
    // 1️⃣ Start at the dashboards list page
    await page.goto("/dashboards");
  
    // 2️⃣ Locate the "More" options button (⋮) for the current dashboard
    const moreOptionsButton = page.locator('[data-testid="dashboard-menu-button"]'); 
    await expect(moreOptionsButton).toBeVisible(); // Ensure it's visible
    await moreOptionsButton.click(); // Open the menu
  
    // 3️⃣ Wait for the "Delete" option in the dropdown menu to be visible
    const deleteButton = page.locator('text=Delete');
    await expect(deleteButton).toBeVisible(); // Ensure the delete button is visible
    await deleteButton.click(); // Click to delete
  
    // 4️⃣ Handle the confirmation (assuming there's a confirmation dialog)
    // const confirmDeleteButton = page.locator('button:has-text("Confirm")'); // Adjust if confirmation button text is different
    // await expect(confirmDeleteButton).toBeVisible();
    // await confirmDeleteButton.click(); // Confirm the deletion
  
    // 5️⃣ Wait for the URL to change, as the page may be redirected after deletion
    await page.waitForURL('/dashboards', { timeout: 10000 }); // Adjust URL if needed
  
    // 6️⃣ Ensure the dashboard is no longer in the list (the deleted dashboard should not be visible)
    const dashboardItem = page.locator('[data-testid^="dashboard-menu-item-"]:first-child');
    await expect(dashboardItem).not.toBeVisible(); // The deleted dashboard should no longer be visible
  });
  test("opens the Add Charts modal and adds a chart to the dashboard", async ({
    page,
  }) => {
    // 1️⃣ Go to the app root (redirects to a dashboard)
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);
  
    // 2️⃣ Capture the number of charts currently rendered
    const initialChartCount = await page.locator(".recharts-surface").count();
  
    // 3️⃣ Open the Add Charts modal
    const addChartsBtn = page.getByRole("button", { name: "Add Charts" });
    await expect(addChartsBtn).toBeVisible();
    await addChartsBtn.click();
  
    // 4️⃣ In the modal click the first “+” to select a chart
    const modal = page.locator('[role="dialog"]');
    const firstChartAdd = modal
      .locator("button[aria-label='Add chart']")
      .first();
    await expect(firstChartAdd).toBeEnabled();
    await firstChartAdd.click();
  
    // 5️⃣ Apply your selection
    await modal.getByRole("button", { name: "Apply" }).click();
  
    // 6️⃣ Wait for the modal to close
    await expect(modal).toBeHidden();
  
    // 7️⃣ Assert that the number of rendered charts increased by one
    await expect(page.locator(".recharts-surface")).toHaveCount(initialChartCount + 1);
  });

  test("verify chart is editable", async ({
    page,
  }) => {
    // 1️⃣ Go to the root, redirect to a dashboard
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);

    // 2️⃣ Enter global edit mode
    const editBtn = page.getByRole("button", { name: "Edit" });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 3️⃣ Click the first card's pencil icon (aria-label="Edit Chart")
    const pencil = page.getByRole("button", { name: "Edit Chart" }).first();
    await expect(pencil).toBeVisible({ timeout: 10_000 });
    await pencil.click();

    // 4️⃣ Fill a new name
    const newName = "🚀 Renamed by Icon";
    const nameInput = page.getByRole("textbox", { name: "Name" }).first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newName);

    // 5️⃣ Exit edit mode
    const doneBtn = page.getByRole("button", { name: "Done" });
    await expect(doneBtn).toBeEnabled();
    await doneBtn.click();

    // 6️⃣ Verify the new name shows up on the dashboard
    await expect(page.getByText(newName)).toBeVisible();
  });
  // test("verify chart deletion", async ({ page }) => {
  //   // 1️⃣ Go to the root, redirect to a dashboard
  //   await page.goto("/");
  //   await page.waitForURL(/\/dashboards\/[^/]+$/);
  
  //   // 2️⃣ Enter global edit mode
  //   const editBtn = page.getByRole("button", { name: "Edit" });
  //   await expect(editBtn).toBeVisible();
  //   await editBtn.click();
  
  //   // 3️⃣ Click the first card's delete icon (aria-label="Delete Chart")
  //   const deleteIcon = page.getByRole("button", { name: "Delete Chart" }).first();
  //   await expect(deleteIcon).toBeVisible({ timeout: 10_000 });
  
  //   // 4️⃣ Count charts before deletion
  //   const initialCount = await page.locator(".recharts-surface").count();
  
  //   // 5️⃣ Click delete and confirm removal
  //   await deleteIcon.click();
  
  //   // If your UI shows a confirmation dialog, handle it here.
  //   // Example:
  //   // const confirm = page.getByRole("button", { name: "Confirm" });
  //   // await expect(confirm).toBeVisible();
  //   // await confirm.click();
  
  //   // 6️⃣ Exit edit mode
  //   const doneBtn = page.getByRole("button", { name: "Done" });
  //   await doneBtn.click();
  
  //   // 7️⃣ Verify chart count decreased by one
  //   await expect(page.locator(".recharts-surface")).toHaveCount(initialCount - 1);
  // });
  test("verify chart deletion", async ({ page }) => {
    // 1️⃣ Go to the root, redirect to a dashboard
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);
  
    // 2️⃣ Enter global edit mode
    const editBtn = page.getByRole("button", { name: "Edit" });
    await expect(editBtn).toBeVisible();
    await editBtn.click();
  
    // 3️⃣ Click the first card's delete icon (aria-label="Delete Chart")
    const deleteIcon = page.getByRole("button", { name: "Delete Chart" }).first();
    await expect(deleteIcon).toBeVisible({ timeout: 10_000 });
  
    // 4️⃣ Count charts before deletion
    const initialCount = await page.locator(".recharts-surface").count();
  
    // 5️⃣ Click delete and confirm removal
    await deleteIcon.click();
  
    // If your UI shows a confirmation dialog, handle it here.
    // Example:
    // const confirm = page.getByRole("button", { name: "Confirm" });
    // await expect(confirm).toBeVisible();
    // await confirm.click();
  
    // 6️⃣ Exit edit mode
    const doneBtn = page.getByRole("button", { name: "Done" });
    await doneBtn.click();
  
    // 7️⃣ Verify chart count decreased by one
    await expect(page.locator(".recharts-surface")).toHaveCount(initialCount - 1);
  });
  test("selecting a preset", async ({
    page,
  }) => {
    // 1️⃣ Go to your dashboard
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);

    // 2️⃣ Locate the preset-select by its placeholder
    const presetSelect = page.getByPlaceholder("Select date range");
    await expect(presetSelect).toBeVisible();

    // 3️⃣ Define the presets to test (must match exactly the data array)
    const presets = ["Today", "7 Days", "30 Days", "3 Months"];

    for (const label of presets) {
      // a) Open the dropdown
      await presetSelect.click();

      // b) Click the option
      const option = page.getByRole("option", { name: label });
      await expect(option).toBeVisible();
      await option.click();

      // c) Assert the input now shows that value
      await expect(presetSelect).toHaveValue(label);

      // (Optional) you could also assert your internal logic:
      // e.g. the date inputs reflect the correct start/end,
      // or that the granularity component updated appropriately.
    }
  });
  test('calender', async ({ page }) => {
    // 1️⃣ Go to the page with the DateRangePicker
    await page.goto('/'); // Replace with the actual route if different
    await page.waitForLoadState('networkidle');
  
    // 2️⃣ Find the date picker input by placeholder
    const dateRangeInput = page.getByPlaceholder('Select date range');
    await expect(dateRangeInput).toBeVisible();
  
    // 3️⃣ Click to open the calendar
    await dateRangeInput.click();
  
    // 4️⃣ Select start date (e.g. 6th)
    const startDateCell = page.getByRole('gridcell', { name: '6' }).first();
    await expect(startDateCell).toBeVisible();
    await startDateCell.click();
  
    // 5️⃣ Select end date (e.g. 13th)
    const endDateCell = page.getByRole('gridcell', { name: '13' }).first();
    await expect(endDateCell).toBeVisible();
    await endDateCell.click();
  
    // 6️⃣ Assert the placeholder input now reflects the selected range
    const inputValue = await dateRangeInput.inputValue();
    expect(inputValue).toMatch(/May 6, 2025.*May 13, 2025/); // Update date format as per actual UI
  });
  // test("selecting a custom date range toggles the preset select to Custom", async ({
  //   page,
  // }) => {
  //   // 1️⃣ Go to the dashboard
  //   await page.goto("/");
  //   await page.waitForURL(/\/dashboards\/[^/]+$/);

  //   // 2️⃣ Locate and click the calendar icon to open the picker
  //   const calendarButton = page.locator('button[aria-label="Calendar"]');
  //   await expect(calendarButton).toBeVisible();
  //   await calendarButton.click();

  //   // 3️⃣ Pick two dates in the calendar grid: day “1” then day “5”
  //   //    Each date is a <button> inside a gridcell
  //   const day1 = page.locator('[role="gridcell"] button', { hasText: "1" }).first();
  //   const day5 = page.locator('[role="gridcell"] button', { hasText: "5" }).first();
  //   await day1.click();
  //   await day5.click();

  //   // 4️⃣ Now the preset select should show “Custom”
  //   const presetSelectInput = page.locator('input[placeholder="Select date range"]');
  //   await expect(presetSelectInput).toHaveValue("Custom");

  //   // 5️⃣ And granularity s hould update to “daily”
  //   const granularityInput = page.locator('input[placeholder="Granularity"]');
  //   await expect(granularityInput).toHaveValue("daily");
  // });
  test('Custom date range and granularity selection with calendar view', async ({ page }) => {
    // 1️⃣ Go to homepage and wait for redirect to dashboard
    await page.goto('/');
    await page.waitForURL(/\/dashboards\/[^/]+$/);
  
    // 2️⃣ Open date range picker
    const dateRangeButton = page.locator('[data-testid="date-range-trigger"]');
    await dateRangeButton.click();
  
    // 3️⃣ Select custom date range: May 6, 2025 – May 13, 2025
    await page.locator('[data-testid="start-date-picker"]').click();
    await page.getByRole('gridcell', { name: '6' }).click();
  
    await page.locator('[data-testid="end-date-picker"]').click();
    await page.getByRole('gridcell', { name: '13' }).click();
  
    // 4️⃣ Assert displayed date range text
    const dateRangeText = await page.locator('[data-testid="date-range-display"]').textContent();
    expect(dateRangeText).toMatch(/May 6, 2025 – May 13, 2025/);
  
    // 5️⃣ Verify granularity is set to daily
    const granularitySelect = page.locator('[data-testid="granularity-select"]');
    await expect(granularitySelect).toHaveValue('daily');
  
    // 6️⃣ Assert calendar header and weeks layout are correct
    await expect(page.locator('text=May 2025')).toBeVisible();
    await expect(page.locator('text=Su Mo Tu We Th Fr Sa')).toBeVisible();
    await expect(page.locator('text=28 29 30 1 2 3 4')).toBeVisible(); // last week of April into May
    await expect(page.locator('text=5 6 7 8 9 10 11')).toBeVisible(); // week of start date
    await expect(page.locator('text=12 13 14 15 16 17 18')).toBeVisible(); // week of end date
  });
  test("visibility of top users chart", async ({ page }) => {
    // 1️⃣ Navigate to the root and wait for dashboard load
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);
  
    // 2️⃣ Locate the "Top Users" chart by its title
    const cardTitle = page.getByText("Top Users", { exact: true });
    
    // 3️⃣ Verify the chart title is visible
    await expect(cardTitle).toBeVisible();
  
   
  });
 
  test('displays the Top Agents chart when data is available', async ({ page }) => {
    // Navigate to the dashboard page
    await page.goto('http://localhost:3000/dashboard'); // update URL as needed
    await page.waitForLoadState('networkidle');

    // Check for the heading "Top Agents"
    const heading = page.getByText('Top Agents', { exact: true });
    await expect(heading).toBeVisible();

    // Check that bar chart elements are rendered (BarList entries)
    const agentBars = page.locator('[data-testid="bar-list-entry"]'); // use your own selector or add one
    await expect(agentBars.first()).toBeVisible();
  });
 
  test("verify top model chart and its data is visible", async ({ page }) => {
    // 1️⃣ Go to the dashboard
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);

    // 2️⃣ Wait for any charts to become visible
    await expect(page.locator(".recharts-surface").first()).toBeVisible({ timeout: 10_000 });

    // Find the analytics card that contains the Top Models chart
    // Using a more general selector to find the heading text
    const topModelsHeading = page.getByText('Top Models', { exact: true });
    await expect(topModelsHeading).toBeVisible({ timeout: 10_000 });

    // Get the parent analytics card element - find the closest card container
    const cardElement = topModelsHeading.locator('xpath=./ancestor::div[contains(@class, "mantine-Card-root") or contains(@class, "mantine-Paper-root")]');
    await expect(cardElement).toBeVisible();

    // 3️⃣ Verify the table structure within this card
    const tableElement = cardElement.locator('table');
    await expect(tableElement).toBeVisible();
    
    // Verify "Model" column header exists
    const modelHeader = tableElement.locator('th', { hasText: 'Model' }).first();
    await expect(modelHeader).toBeVisible();

    // Verify "Tokens" column header exists
    const tokensHeader = tableElement.locator('th', { hasText: 'Tokens' }).first();
    await expect(tokensHeader).toBeVisible();

    // Verify "Cost" column header exists
    const costHeader = tableElement.locator('th', { hasText: 'Cost' }).first();
    await expect(costHeader).toBeVisible();

    // 4️⃣ Verify table rows exist with data
    const tableRows = tableElement.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // 5️⃣ Verify that at least the first row has model name and progress bar
    if (rowCount > 0) {
      const firstRow = tableRows.first();
      
      // Check for the progress bar which represents the model data
      const progressBar = firstRow.locator('.mantine-Progress-root');
      await expect(progressBar).toBeVisible();
      
      // Check for progress sections inside the bar
      const progressSections = progressBar.locator('.mantine-Progress-section');
      const sectionCount = await progressSections.count();
      expect(sectionCount).toBeGreaterThan(0);
    }
  });
  test("verify Top Users chart and its data is visible", async ({ page }) => {
    // 1️⃣ Go to the dashboard
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);

    // 2️⃣ Wait for any charts to become visible
    await expect(page.locator(".recharts-surface").first()).toBeVisible({ timeout: 10_000 });

    // Find the analytics card that contains the Top Users chart
    const topUsersHeading = page.getByText('Top Users', { exact: true });
    await expect(topUsersHeading).toBeVisible({ timeout: 10_000 });

    // Get the parent analytics card element
    const cardElement = topUsersHeading.locator('xpath=./ancestor::div[contains(@class, "mantine-Card-root") or contains(@class, "mantine-Paper-root")]');
    await expect(cardElement).toBeVisible();

    // 3️⃣ Verify the table structure within this card
    const tableElement = cardElement.locator('table');
    await expect(tableElement).toBeVisible();
    
    // Verify column headers exist
    const userHeader = tableElement.locator('th', { hasText: 'User' }).first();
    await expect(userHeader).toBeVisible();

    const costHeader = tableElement.locator('th', { hasText: 'Cost' }).first();
    await expect(costHeader).toBeVisible();

    // 4️⃣ Verify table rows exist with data
    const tableRows = tableElement.locator('tbody tr');
    
    // Check if there's actual data in the table
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    if (rowCount > 0) {
      // Check first row for specific elements based on the screenshot
      const firstRow = tableRows.first();
      
      // Check for user avatar with initials (might be "JO" as seen in screenshot)
      const avatar = firstRow.locator('[class*="mantine-Avatar-root"]');
      await expect(avatar).toBeVisible();
      
      // Check for the user name "John Doe" (as seen in screenshot)
      // Note: We use a partial match since the exact format might change
      const userName = firstRow.getByText('John Doe', { exact: false });
      await expect(userName).toBeVisible();
      
      // Check that cost is displayed (possibly in format $0.00166)
      // Using a regex pattern to match currency format
      const costCell = firstRow.locator('td').nth(1);
      await expect(costCell).toBeVisible();
      
      // Optional: Verify the cost text matches currency format
      const costText = await costCell.textContent();
      expect(costText).toMatch(/\$\d+\.\d+/);
    }
  });
  test("verify token count and chart is visible", async ({ page }) => {
    // 1️⃣ Go to the dashboard
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);

    // 2️⃣ Wait for the dashboard to load completely
    await expect(page.locator(".recharts-surface").first()).toBeVisible({ timeout: 10_000 });

    // 3️⃣ Find the standalone Tokens section that's not in a table
    // Using a different selector strategy to find the correct "Tokens" element
    const tokensMetric = page.getByRole('paragraph').filter({ hasText: 'Tokens' }).first();
    await expect(tokensMetric).toBeVisible({ timeout: 10_000 });
    
    // 4️⃣ Since we have multiple "Tokens" elements, navigate up and look for the value nearby
    // Find a parent container that would include both the label and value
    const parentContainer = tokensMetric.locator('xpath=./ancestor::div[position()<=3]');
    
    // Look for a number displayed near the Tokens label
    // Using a more generic regex that matches one or more digits
    const tokenValue = parentContainer.locator('text=/^[0-9]+$/');
    await expect(tokenValue).toBeVisible({ timeout: 5000 });
    
    // Verify the token count is a valid number
    const tokenValueText = await tokenValue.textContent();
    expect(tokenValueText).toBeTruthy();
    const numericValue = Number(tokenValueText?.trim());
    expect(numericValue).not.toBeNaN();
    console.log(`Found token count: ${numericValue}`);
    
    // 5️⃣ Verify the token chart is visible
    // First find the main chart container by looking for the SVG element
    const chartSurface = page.locator('.recharts-surface').first();
    await expect(chartSurface).toBeVisible({ timeout: 10_000 });
    
    // 6️⃣ Verify the chart has content by checking for common chart elements
    // Most charts will have a surface and at least one path element for the data
    const chartElements = chartSurface.locator('path');
    const elementCount = await chartElements.count();
    expect(elementCount).toBeGreaterThan(0);
    console.log(`Found ${elementCount} path elements in the chart`);
    
    // 7️⃣ Instead of asserting visibility on multiple elements, check count and verify first one
    // Using .first() to avoid strict mode violations by selecting only one element
    const firstPath = chartSurface.locator('.recharts-curve').first();
    await expect(firstPath).toBeVisible();
    
    // Verify there's a path for gpt-4o as seen in the error output
    const pathWithModelName = chartSurface.locator('path[name="gpt-4o"]').first();
    await expect(pathWithModelName).toBeVisible();
  });
  test("verify Active Conversations chart and its data is visible", async ({ page }) => {
    // 1️⃣ Go to the dashboard
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);

    // 2️⃣ Wait for the dashboard to load completely
    await expect(page.locator(".recharts-surface").first()).toBeVisible({ timeout: 10_000 });

    // 3️⃣ Find the Active Conversations section
    const activeConversationsHeading = page.getByText('Active Conversations', { exact: true }).first();
    await expect(activeConversationsHeading).toBeVisible({ timeout: 10_000 });

    // 4️⃣ Get the parent card element
    const cardElement = activeConversationsHeading.locator('xpath=./ancestor::div[contains(@class, "mantine-Card-root") or contains(@class, "mantine-Paper-root")]');
    await expect(cardElement).toBeVisible();

    // 5️⃣ Verify that a numeric value is displayed for the count
    const countElement = cardElement.locator('text=/^[0-9]+$/');
    await expect(countElement).toBeVisible();
    
    // 6️⃣ Verify the chart visualization is present
    // Find the chart container within this card
    const chartContainer = cardElement.locator('.recharts-responsive-container');
    await expect(chartContainer).toBeVisible();
    
    // 7️⃣ Verify the chart has at least basic components
    const chartSurface = cardElement.locator('.recharts-surface');
    await expect(chartSurface).toBeVisible();
    
    // 8️⃣ Verify the chart has date labels (x-axis)
    const xAxisElement = chartSurface.locator('.recharts-cartesian-axis-ticks');
    await expect(xAxisElement).toBeVisible();
    
    // Confirm there's at least one tick with a label
    const tickCount = await xAxisElement.locator('g').count();
    expect(tickCount).toBeGreaterThan(0);
    
    // 9️⃣ Check if the chart contains path elements representing the cost data
    const pathElements = chartSurface.locator('path');
    const pathCount = await pathElements.count();
    expect(pathCount).toBeGreaterThan(0);
    console.log(`Found ${pathCount} path elements in the Active Conversations chart`);
    
    // // 🔟 Verify there's at least one area path representing the cost data
    // const areaPath = chartSurface.locator('path.recharts-area-area').first();
    // await expect(areaPath).toBeVisible();
  });
  test('daily', async ({ page }) => {
    // 1. Get date range components
    await page.goto('/');
    await page.waitForURL(/\/dashboards\/[^/]+$/);
    const granularitySelect = page.locator('[data-testid="granularity-select"]');
    const dateRangeSelect = page.locator('[data-testid="date-range-select"]');
    
    // 2. Test with 7-day range
    await dateRangeSelect.click();
    await page.getByRole('option', { name: '7 Days' }).click();
    await expect(granularitySelect).toHaveValue('daily');
    await expect(granularitySelect.locator('option')).toHaveCount(1);

    // 3. Test with 8-day custom range
    await setCustomDateRange(page, 8);
    
    // Verify available options
    const options = granularitySelect.locator('option');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toHaveText('Daily');
    await expect(options.last()).toHaveText('Weekly');

    // 4. Test weekly selection
    await granularitySelect.selectOption('weekly');
    await expect(granularitySelect).toHaveValue('weekly');

    // 5. Test with 60-day range
    await setCustomDateRange(page, 60);
    await expect(granularitySelect).toHaveValue('daily');
    await expect(options).toHaveCount(2);
  });

  async function setCustomDateRange(page:any, days: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    await page.locator('[data-testid="date-range-picker"]').click();
    
    // Clear existing dates
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    
    // Set start date
    await page.locator('[data-testid="start-date-input"]').fill(formatDate(startDate));
    // Set end date
    await page.locator('[data-testid="end-date-input"]').fill(formatDate(endDate));
    await page.keyboard.press('Escape');
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
  }
  test("edit title and description", async ({
    page,
  }) => {
    // 1️⃣ Go to the root, redirect to a dashboard
    await page.goto("/");
    await page.waitForURL(/\/dashboards\/[^/]+$/);

    // 2️⃣ Enter global edit mode
    const editBtn = page.getByRole("button", { name: "Edit" });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 3️⃣ Click the first card's pencil icon (aria-label="Edit Chart")
    const pencil = page.getByRole("button", { name: "Edit Chart" }).first();
    await expect(pencil).toBeVisible({ timeout: 10_000 });
    await pencil.click();

    // 4️⃣ Fill a new name
    const newName = "🚀 Renamed by Icon";
    const nameInput = page.getByRole("textbox", { name: "Name" }).first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newName);

    const newDescription="Rename by Description"
    const newDescriptionInput=page.getByRole("textbox", { name: "Description" }).first();
    await expect(newDescriptionInput).toBeVisible();
    await newDescriptionInput.fill(newDescription);

    // 5️⃣ Exit edit mode
    const doneBtn = page.getByRole("button", { name: "Done" });
    await expect(doneBtn).toBeEnabled();
    await doneBtn.click();

    // 6️⃣ Verify the new name shows up on the dashboard
    await expect(page.getByText(newName)).toBeVisible();
  });
  test('select custom date range ', async ({ page }) => {
    // 1️⃣ Go to the page (adjust URL as needed)
    await page.goto('/');
    // wait for the picker to be present
    await page.waitForSelector('[data-testid="date-range-granularity-picker"]');

    // 2️⃣ Open preset select and choose "Custom"
    const presetSelect = page.locator('[data-testid="date-range-select"]');
    await expect(presetSelect).toBeVisible();
    await presetSelect.click();
    await page.getByRole('option', { name: 'Custom' }).click();

    // 3️⃣ Open the date‐picker calendar
    const dateplaceholder=page.getByPlaceholder('Pick date range');
    console.log(dateplaceholder,'console.log');
    
    const dateInput = page.locator('[data-testid="date-picker-input"]');
    await expect(dateInput).toBeVisible();
    await dateInput.click();

    // 4️⃣ Pick May 6 (start) and May 13 (end)
    await page.getByRole('gridcell', { name: '6' }).click();
    await page.getByRole('gridcell', { name: '13' }).click();

    // 5️⃣ Verify displayed value in the input
    const displayed = await dateInput.inputValue();
    await expect(displayed).toMatch(/May 6, 2025.*May 13, 2025/);

    // 6️⃣ Open granularity dropdown and verify options
    const granSelect = page.locator('[data-testid="granularity-select"]');
    await expect(granSelect).toBeVisible();
    await granSelect.click();

    // both options should appear
    await expect(page.getByRole('option', { name: 'Daily' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Weekly' })).toBeVisible();

    // 7️⃣ Change to Weekly and confirm
    await page.getByRole('option', { name: 'Weekly' }).click();
    await expect(granSelect).toHaveText('Weekly');
  });
});
