import { test, expect } from "@playwright/test";

test.describe("Custom API Endpoints - Basic Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");
    
    // Create or select a template
    const hasTemplates = await page.locator('[data-testid="template-item"]').count() > 0;
    if (!hasTemplates) {
      // Create first template
      const createButton = page.getByTestId("empty-action");
      if (await createButton.isVisible()) {
        await createButton.click();
      } else {
        await page.getByTestId("create-template").click();
      }
    } else {
      // Click on first template
      await page.locator('[data-testid="template-item"]').first().click();
    }
    
    await page.waitForTimeout(1000); // Wait for template to load
  });

  test("should switch between LLM and API Endpoint modes", async ({ page }) => {
    // Check if Run Mode is visible
    const runModeText = page.getByText("Run Mode");
    await expect(runModeText).toBeVisible();
    
    // Default should be LLM Playground
    const llmRadio = page.locator('input[value="playground"]');
    await expect(llmRadio).toBeChecked();
    
    // Switch to API Endpoint
    const apiRadio = page.locator('input[value="endpoint"]');
    await apiRadio.click();
    
    // Verify API endpoint UI appears
    await expect(page.getByText("Select Endpoint")).toBeVisible();
    await expect(page.getByRole("button", { name: "Configure New" })).toBeVisible();
    
    // Switch back to LLM
    await llmRadio.click();
    
    // Verify API endpoint UI disappears
    await expect(page.getByText("Select Endpoint")).not.toBeVisible();
  });

  test("should create and select an endpoint", async ({ page }) => {
    // Switch to API Endpoint mode
    await page.locator('input[value="endpoint"]').click();
    
    // Click Configure New
    await page.getByRole("button", { name: "Configure New" }).click();
    
    // Wait for modal
    await expect(page.getByRole("dialog")).toBeVisible();
    
    // Fill endpoint form
    await page.getByLabel("Name").fill("Test Endpoint");
    await page.getByLabel("URL").fill("https://api.example.com/chat");
    
    // Select no authentication
    const authSelect = page.getByLabel("Authentication Type");
    await authSelect.selectOption("none");
    
    // Save endpoint
    await page.getByRole("button", { name: "Save" }).click();
    
    // Verify endpoint appears in list
    await expect(page.getByText("Test Endpoint")).toBeVisible();
    await expect(page.getByText("https://api.example.com/chat")).toBeVisible();
    
    // Verify it's selected (has blue border)
    const selectedCard = page.locator('div').filter({ hasText: "Test Endpoint" }).first();
    const styles = await selectedCard.getAttribute('style');
    expect(styles).toContain('blue');
  });

  test("should create endpoint with Bearer authentication", async ({ page }) => {
    // Switch to API Endpoint mode
    await page.locator('input[value="endpoint"]').click();
    
    // Click Configure New
    await page.getByRole("button", { name: "Configure New" }).click();
    
    // Fill endpoint form
    await page.getByLabel("Name").fill("Bearer Auth Endpoint");
    await page.getByLabel("URL").fill("https://api.example.com/v1/chat");
    
    // Select Bearer authentication
    await page.getByLabel("Authentication Type").selectOption("bearer");
    
    // Bearer token field should appear
    const bearerTokenField = page.getByLabel("Bearer Token");
    await expect(bearerTokenField).toBeVisible();
    await bearerTokenField.fill("sk-test-token-123456");
    
    // Save
    await page.getByRole("button", { name: "Save" }).click();
    
    // Verify endpoint created
    await expect(page.getByText("Bearer Auth Endpoint")).toBeVisible();
    
    // Click on the endpoint to select it
    await page.getByText("Bearer Auth Endpoint").click();
    
    // Verify auth is shown as Bearer ****
    await expect(page.getByText("Bearer ****")).toBeVisible();
  });

  test("should show protected fields in JSON editor", async ({ page }) => {
    // First create an endpoint
    await page.locator('input[value="endpoint"]').click();
    await page.getByRole("button", { name: "Configure New" }).click();
    
    await page.getByLabel("Name").fill("JSON Editor Test");
    await page.getByLabel("URL").fill("https://api.example.com/chat");
    await page.getByLabel("Authentication Type").selectOption("none");
    await page.getByRole("button", { name: "Save" }).click();
    
    // Select the endpoint
    await page.getByText("JSON Editor Test").click();
    
    // Enter some prompt content
    const promptInput = page.getByPlaceholder("Enter a user prompt");
    await promptInput.fill("Hello, this is a test prompt");
    
    // Wait for JSON editor to update
    await page.waitForTimeout(500);
    
    // Check that protected fields are visible
    const editorContent = page.locator('.monaco-editor').first();
    await expect(editorContent).toContainText('"messages":');
    await expect(editorContent).toContainText('"model_params":');
    await expect(editorContent).toContainText('"role": "user"');
    await expect(editorContent).toContainText('"content": "Hello, this is a test prompt"');
  });

  test("should edit and delete endpoints", async ({ page }) => {
    // Create an endpoint first
    await page.locator('input[value="endpoint"]').click();
    await page.getByRole("button", { name: "Configure New" }).click();
    
    await page.getByLabel("Name").fill("Endpoint to Edit");
    await page.getByLabel("URL").fill("https://old-url.com/api");
    await page.getByLabel("Authentication Type").selectOption("none");
    await page.getByRole("button", { name: "Save" }).click();
    
    // Select the endpoint
    await page.getByText("Endpoint to Edit").click();
    
    // Click settings icon
    const settingsButton = page.locator('button[aria-label="Settings"]');
    await settingsButton.click();
    
    // Edit the endpoint
    await page.getByLabel("Name").clear();
    await page.getByLabel("Name").fill("Edited Endpoint");
    await page.getByLabel("URL").clear();
    await page.getByLabel("URL").fill("https://new-url.com/api");
    await page.getByRole("button", { name: "Save" }).click();
    
    // Verify changes
    await expect(page.getByText("Edited Endpoint")).toBeVisible();
    await expect(page.getByText("https://new-url.com/api")).toBeVisible();
    
    // Delete the endpoint
    await page.getByText("Edited Endpoint").click();
    const deleteButton = page.locator('button[aria-label="Delete"]');
    await deleteButton.click();
    
    // Verify deletion
    await expect(page.getByText("Endpoint deleted")).toBeVisible();
    await expect(page.getByText("Edited Endpoint")).not.toBeVisible();
  });

  test("should handle API response formats", async ({ page }) => {
    // Create endpoint
    await page.locator('input[value="endpoint"]').click();
    await page.getByRole("button", { name: "Configure New" }).click();
    
    await page.getByLabel("Name").fill("Response Test");
    await page.getByLabel("URL").fill("http://localhost:3333/v1/test-endpoint");
    await page.getByLabel("Authentication Type").selectOption("none");
    await page.getByRole("button", { name: "Save" }).click();
    
    // Select endpoint
    await page.getByText("Response Test").click();
    
    // Enter prompt
    await page.getByPlaceholder("Enter a user prompt").fill("Test prompt");
    
    // Mock different response types
    // Test 1: OpenAI message array
    await page.route('**/test-endpoint', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { role: "user", content: "Test prompt" },
          { role: "assistant", content: "This is the assistant response" }
        ])
      });
    });
    
    // Run the prompt
    const runButton = page.getByRole("button", { name: "Run" });
    await runButton.click();
    
    // Should display assistant message properly
    await expect(page.getByText("assistant")).toBeVisible();
    await expect(page.getByText("This is the assistant response")).toBeVisible();
    
    // Test 2: Raw JSON response
    await page.route('**/test-endpoint', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          custom: "response", 
          data: { nested: "value" } 
        })
      });
    });
    
    // Run again
    await runButton.click();
    
    // Should display as formatted JSON
    await expect(page.getByText(/"custom":/)).toBeVisible();
    await expect(page.getByText(/"nested":/)).toBeVisible();
  });

  test("should validate endpoint configuration", async ({ page }) => {
    // Switch to API Endpoint mode
    await page.locator('input[value="endpoint"]').click();
    
    // Click Configure New
    await page.getByRole("button", { name: "Configure New" }).click();
    
    // Try to save without required fields
    const saveButton = page.getByRole("button", { name: "Save" });
    
    // Should be disabled without name and URL
    await expect(saveButton).toBeDisabled();
    
    // Add name only
    await page.getByLabel("Name").fill("Test");
    await expect(saveButton).toBeDisabled();
    
    // Add invalid URL
    await page.getByLabel("URL").fill("not-a-url");
    await expect(saveButton).toBeEnabled();
    
    // Try to save - should show error
    await saveButton.click();
    await expect(page.getByText("Error saving endpoint")).toBeVisible();
    
    // Fix URL
    await page.getByLabel("URL").clear();
    await page.getByLabel("URL").fill("https://valid-url.com/api");
    await saveButton.click();
    
    // Should succeed
    await expect(page.getByText("Test")).toBeVisible();
  });
});