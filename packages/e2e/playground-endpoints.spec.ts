import { expect, test } from "@playwright/test";

test("create, edit and delete custom endpoint", async ({ page }) => {
  await page.goto("/prompts");
  await page.waitForLoadState("networkidle");

  // Create a new prompt first
  await page.getByTestId("empty-action").click();
  await page.getByTestId("rename-template-input").fill("test-endpoint-prompt");
  await page.getByTestId("rename-template-input").press("Enter");
  
  await expect(page.getByText("test-endpoint-prompt")).toBeVisible();
  await page.waitForSelector("[data-testid=run-playground]");

  // Switch to API Endpoint mode
  await page.getByText("API Endpoint").click();
  
  // Click Configure New Endpoint button
  await page.getByText("Configure New Endpoint").click();
  
  // Fill in the endpoint details
  await page.getByPlaceholder("e.g., Production API").fill("Test Endpoint");
  await page.getByPlaceholder("https://api.myapp.com/chat").fill("https://httpbin.org/post");
  
  // Select Bearer authentication
  await page.getByRole('textbox', { name: 'Authentication Type' }).click();
  await page.getByText("Bearer Token").click();
  await page.getByPlaceholder("Enter your token").fill("test-token-123");
  
  // Add a custom header
  await page.getByText("Add header").click();
  // Get the last header name input (the newly added one)
  await page.getByPlaceholder("Header name").last().fill("X-Custom-Header");
  await page.getByPlaceholder("Header value").last().fill("custom-value");
  
  // Save the endpoint
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  
  // Verify endpoint was created
  await expect(page.getByText("Test Endpoint")).toBeVisible();
  await expect(page.getByText("https://httpbin.org/post")).toBeVisible();
  
  // Edit the endpoint - click on the settings icon that appears with the endpoint
  await page.getByText("Test Endpoint").click();
  // Wait for the endpoint to be selected and settings icon to appear
  await page.waitForTimeout(500);
  // Click the settings button (first button after the endpoint text)
  await page.locator('p:has-text("Test Endpoint") + p + button').first().click();
  
  // Update the name
  await page.locator('input[value="Test Endpoint"]').fill("Updated Endpoint");
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  
  // Verify update
  await expect(page.getByText("Updated Endpoint")).toBeVisible();
  
  // Delete the endpoint - click on the trash icon
  await page.getByText("Updated Endpoint").click();
  await page.waitForTimeout(500);
  // Click the delete button (second button after the endpoint text)
  await page.locator('p:has-text("Updated Endpoint") + p + button + button').click();
  
  // Verify deletion
  await expect(page.getByText("Updated Endpoint")).not.toBeVisible();
  await expect(page.getByText("Configure New Endpoint")).toBeVisible();
});

test("test prompt against custom endpoint with different auth types", async ({ page }) => {
  await page.goto("/prompts");
  await page.waitForLoadState("networkidle");
  
  // Navigate to the test prompt
  await page.getByText("test-endpoint-prompt").click();
  await page.waitForSelector("[data-testid=run-playground]");
  
  // Switch to API Endpoint mode
  await page.getByText("API Endpoint").click();
  
  // Test with no authentication
  // Check if we need to click Configure New or Configure New Endpoint
  const configNewEndpoint = await page.getByText("Configure New Endpoint").isVisible().catch(() => false);
  if (configNewEndpoint) {
    await page.getByText("Configure New Endpoint").click();
  } else {
    await page.getByText("Configure New").click();
  }
  await page.getByPlaceholder("e.g., Production API").fill("No Auth Endpoint");
  await page.getByPlaceholder("https://api.myapp.com/chat").fill("https://httpbin.org/post");
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  
  // Run the endpoint
  await page.getByText("Run on Endpoint").click();
  
  // Wait for response - httpbin echoes back the request
  await expect(page.getByText(/"messages":/)).toBeVisible({ timeout: 10000 });
  
  // Create API Key endpoint
  await page.getByText("Configure New").click();
  await page.getByPlaceholder("e.g., Production API").fill("API Key Endpoint");
  await page.getByPlaceholder("https://api.myapp.com/chat").fill("https://httpbin.org/post");
  await page.getByRole('textbox', { name: 'Authentication Type' }).click();
  await page.getByText("API Key").click();
  await page.getByPlaceholder("e.g., X-API-Key").fill("X-Test-Key");
  await page.getByPlaceholder("Enter your API key").fill("test-api-key-456");
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  
  // Select and run the API Key endpoint
  await page.getByText("API Key Endpoint").click();
  await page.getByText("Run on Endpoint").click();
  
  // Verify response
  await expect(page.getByText(/"messages":/)).toBeVisible({ timeout: 10000 });
  
  // Create Basic Auth endpoint
  await page.getByText("Configure New").click();
  await page.getByPlaceholder("e.g., Production API").fill("Basic Auth Endpoint");
  await page.getByPlaceholder("https://api.myapp.com/chat").fill("https://httpbin.org/post");
  await page.getByRole('textbox', { name: 'Authentication Type' }).click();
  await page.getByText("Basic Auth").click();
  await page.getByPlaceholder("Username").fill("testuser");
  await page.getByPlaceholder("Password").fill("testpass");
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  
  // Select and run the Basic Auth endpoint
  await page.getByText("Basic Auth Endpoint").click();
  await page.getByText("Run on Endpoint").click();
  
  // Verify response
  await expect(page.getByText(/"messages":/)).toBeVisible({ timeout: 10000 });
});

test("test custom endpoint with default payload", async ({ page }) => {
  await page.goto("/prompts");
  await page.waitForLoadState("networkidle");
  
  // Navigate to the test prompt
  await page.getByText("test-endpoint-prompt").click();
  await page.waitForSelector("[data-testid=run-playground]");
  
  // Switch to API Endpoint mode
  await page.getByText("API Endpoint").click();
  
  // Create endpoint with default payload
  await page.getByText("Configure New").click();
  await page.getByPlaceholder("e.g., Production API").fill("Endpoint with Payload");
  await page.getByPlaceholder("https://api.myapp.com/chat").fill("https://httpbin.org/post");
  
  // Add default payload
  // The default payload field is always visible, just fill it
  await page.getByPlaceholder('{"key": "value"}').click();
  await page.getByPlaceholder('{"key": "value"}').fill('{"temperature": 0.7, "max_tokens": 100, "custom_field": "test_value"}');
  
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  
  // Wait for modal to close and endpoint to be created
  await page.waitForTimeout(1000);
  
  // Select the endpoint
  await page.getByText("Endpoint with Payload").click();
  
  // Verify the payload editor shows the default values
  await expect(page.getByText(/"temperature": 0.7/)).toBeVisible();
  await expect(page.getByText(/"custom_field": "test_value"/)).toBeVisible();
  
  // Run the endpoint
  await page.getByText("Run on Endpoint").click();
  
  // Verify the response includes our custom fields from the default payload
  await page.waitForTimeout(2000); // Wait for response
  const responseText = await page.locator('[role="main"]').textContent();
  expect(responseText).toContain('"custom_field": "test_value"');
});

test("test connection feature for endpoints", async ({ page }) => {
  await page.goto("/prompts");
  await page.waitForLoadState("networkidle");
  
  // Navigate to the test prompt
  await page.getByText("test-endpoint-prompt").click();
  await page.waitForSelector("[data-testid=run-playground]");
  
  // Switch to API Endpoint mode
  await page.getByText("API Endpoint").click();
  
  // Create new endpoint
  await page.getByText("Configure New").click();
  await page.getByPlaceholder("e.g., Production API").fill("Test Connection Endpoint");
  await page.getByPlaceholder("https://api.myapp.com/chat").fill("https://httpbin.org/status/200");
  
  // Test successful connection
  await page.getByText("Test Connection").click();
  await expect(page.getByText("Connection successful")).toBeVisible();
  
  // Change to a failing URL
  await page.locator('input[value="https://httpbin.org/status/200"]').fill("https://httpbin.org/status/500");
  
  // Test failed connection
  await page.getByText("Test Connection").click();
  await expect(page.getByText(/Connection failed|Error/)).toBeVisible();
  
  // Don't save, just cancel
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("verify payload protection for messages and model_params", async ({ page }) => {
  await page.goto("/prompts");
  await page.waitForLoadState("networkidle");
  
  // Navigate to the test prompt
  await page.getByText("test-endpoint-prompt").click();
  await page.waitForSelector("[data-testid=run-playground]");
  
  // Switch to API Endpoint mode
  await page.getByText("API Endpoint").click();
  
  // Select an existing endpoint or create one if needed
  const endpointExists = await page.getByText("No Auth Endpoint").isVisible().catch(() => false);
  if (!endpointExists) {
    await page.getByText("Configure New").click();
    await page.getByPlaceholder("e.g., Production API").fill("No Auth Endpoint");
    await page.getByPlaceholder("https://api.myapp.com/chat").fill("https://httpbin.org/post");
    await page.getByRole('button', { name: 'Save', exact: true }).click();
  }
  
  await page.getByText("No Auth Endpoint").click();
  
  // Try to modify protected fields in the payload editor
  const payloadEditor = page.locator('.monaco-editor').first();
  await payloadEditor.click();
  
  // Clear and type custom payload with messages and model_params
  await page.keyboard.press("Control+a");
  await page.keyboard.type('{"messages": [{"role": "user", "content": "hacked"}], "model_params": {"temperature": 2.0}, "custom": "value"}');
  
  // Run the endpoint
  await page.getByText("Run on Endpoint").click();
  
  // Wait for response and verify that our "hacked" message was NOT sent
  // Instead, the original prompt messages should be sent
  await expect(page.getByText(/"content": "Hi!"/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/"content": "hacked"/)).not.toBeVisible();
  
  // Verify the endpoint ran successfully - httpbin echoes back the request
  // The response should contain our custom field in the echoed data
  await page.waitForTimeout(2000); // Wait for response to render
  const responseText = await page.locator('[role="main"]').textContent();
  expect(responseText).toContain('"custom": "value"');
});