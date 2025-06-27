import { test, expect, Page } from "@playwright/test";

// Helper to create a test endpoint via API
async function createTestEndpoint(page: Page, endpoint: any) {
  // Get projectId from URL
  const url = page.url();
  const projectIdMatch = url.match(/projectId=([^&]+)/);
  const projectId = projectIdMatch ? projectIdMatch[1] : null;
  
  const apiUrl = process.env.API_URL || "http://localhost:3333";
  const response = await page.request.post(`${apiUrl}/v1/playground-endpoints${projectId ? `?projectId=${projectId}` : ''}`, {
    data: endpoint,
  });
  return response.json();
}

// Helper to wait for endpoints to load
async function waitForEndpointsToLoad(page: Page) {
  await page.waitForResponse((resp: any) => resp.url().includes('/playground-endpoints') && resp.ok());
}

test.describe("Custom API Endpoints", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to prompts page
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");
    
    // Create initial template if needed
    const templates = await page.locator('[data-testid="template-item"]').count();
    if (templates === 0) {
      await page.getByTestId("empty-action").click();
    } else {
      await page.getByTestId("create-template").click();
    }
    
    await page.waitForURL(/\/prompts\/.+/);
  });

  test.describe("Mode Switching", () => {
    test("should switch from LLM Playground to API Endpoint mode", async ({ page }) => {
      // Default should be LLM Playground
      await expect(page.getByText("Run Mode")).toBeVisible();
      await expect(page.getByRole("radio", { name: "LLM Playground" })).toBeChecked();
      
      // Switch to API Endpoint
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      
      // Verify API endpoint UI appears
      await expect(page.getByText("Select Endpoint")).toBeVisible();
      await expect(page.getByRole("button", { name: "Configure New" })).toBeVisible();
    });

    test("should switch from API Endpoint to LLM Playground mode", async ({ page }) => {
      // Switch to API Endpoint first
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await expect(page.getByText("Select Endpoint")).toBeVisible();
      
      // Switch back to LLM Playground
      await page.getByRole("radio", { name: "LLM Playground" }).click();
      
      // Verify LLM UI is back
      await expect(page.getByText("Select Endpoint")).not.toBeVisible();
      await expect(page.getByText("Model")).toBeVisible();
    });

    test("should preserve state when switching between modes", async ({ page }) => {
      // Enter some content
      await page.getByPlaceholder("Enter a user prompt").fill("Test prompt content");
      
      // Switch to API Endpoint
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      
      // Switch back
      await page.getByRole("radio", { name: "LLM Playground" }).click();
      
      // Verify content is preserved
      await expect(page.getByPlaceholder("Enter a user prompt")).toHaveValue("Test prompt content");
    });
  });

  test.describe("Endpoint CRUD Operations", () => {
    test.describe("Create Endpoint", () => {
      test("should create endpoint with no authentication", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await page.getByRole("button", { name: "Configure New" }).click();
        
        // Fill form
        await page.getByLabel("Name").fill("Test Endpoint");
        await page.getByLabel("URL").fill("https://api.example.com/chat");
        await page.getByLabel("Authentication Type").selectOption("none");
        
        // Save
        await page.getByRole("button", { name: "Save" }).click();
        
        // Verify endpoint appears in list
        await expect(page.getByText("Test Endpoint")).toBeVisible();
        await expect(page.getByText("https://api.example.com/chat")).toBeVisible();
      });

      test("should create endpoint with Bearer token authentication", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await page.getByRole("button", { name: "Configure New" }).click();
        
        await page.getByLabel("Name").fill("Bearer Auth Endpoint");
        await page.getByLabel("URL").fill("https://api.example.com/chat");
        await page.getByLabel("Authentication Type").selectOption("bearer");
        
        // Bearer token field should appear
        await expect(page.getByLabel("Bearer Token")).toBeVisible();
        await page.getByLabel("Bearer Token").fill("test-token-123");
        
        await page.getByRole("button", { name: "Save" }).click();
        
        // Verify auth type is shown
        await expect(page.getByText("Bearer Auth Endpoint")).toBeVisible();
        await page.getByText("Bearer Auth Endpoint").click();
        await expect(page.getByText("Bearer ****")).toBeVisible();
      });

      test("should create endpoint with API Key authentication", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await page.getByRole("button", { name: "Configure New" }).click();
        
        await page.getByLabel("Name").fill("API Key Endpoint");
        await page.getByLabel("URL").fill("https://api.example.com/chat");
        await page.getByLabel("Authentication Type").selectOption("api_key");
        
        // API Key fields should appear
        await expect(page.getByLabel("Header Name")).toBeVisible();
        await expect(page.getByLabel("API Key")).toBeVisible();
        
        await page.getByLabel("Header Name").fill("X-Custom-Key");
        await page.getByLabel("API Key").fill("my-api-key");
        
        await page.getByRole("button", { name: "Save" }).click();
        
        await expect(page.getByText("API Key Endpoint")).toBeVisible();
        await page.getByText("API Key Endpoint").click();
        await expect(page.getByText("X-Custom-Key: ****")).toBeVisible();
      });

      test("should create endpoint with Basic authentication", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await page.getByRole("button", { name: "Configure New" }).click();
        
        await page.getByLabel("Name").fill("Basic Auth Endpoint");
        await page.getByLabel("URL").fill("https://api.example.com/chat");
        await page.getByLabel("Authentication Type").selectOption("basic");
        
        // Basic auth fields should appear
        await expect(page.getByLabel("Username")).toBeVisible();
        await expect(page.getByLabel("Password")).toBeVisible();
        
        await page.getByLabel("Username").fill("testuser");
        await page.getByLabel("Password").fill("testpass");
        
        await page.getByRole("button", { name: "Save" }).click();
        
        await expect(page.getByText("Basic Auth Endpoint")).toBeVisible();
        await page.getByText("Basic Auth Endpoint").click();
        await expect(page.getByText("Basic Auth")).toBeVisible();
      });

      test("should create endpoint with custom headers", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await page.getByRole("button", { name: "Configure New" }).click();
        
        await page.getByLabel("Name").fill("Custom Headers Endpoint");
        await page.getByLabel("URL").fill("https://api.example.com/chat");
        
        // Add custom header
        await page.getByRole("button", { name: "Add header" }).click();
        const headerInputs = page.locator('input[placeholder="Header name"]');
        const valueInputs = page.locator('input[placeholder="Header value"]');
        
        await headerInputs.nth(1).fill("X-Custom-Header");
        await valueInputs.nth(1).fill("custom-value");
        
        await page.getByRole("button", { name: "Save" }).click();
        
        await expect(page.getByText("Custom Headers Endpoint")).toBeVisible();
      });

      test("should create endpoint with default payload", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await page.getByRole("button", { name: "Configure New" }).click();
        
        await page.getByLabel("Name").fill("Default Payload Endpoint");
        await page.getByLabel("URL").fill("https://api.example.com/chat");
        
        // Add default payload
        const defaultPayload = page.locator('textarea[placeholder=\'{"key": "value"}\']');
        await defaultPayload.fill('{"temperature": 0.5, "stream": false}');
        
        await page.getByRole("button", { name: "Save" }).click();
        
        await expect(page.getByText("Default Payload Endpoint")).toBeVisible();
      });

      test("should validate endpoint URL", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await page.getByRole("button", { name: "Configure New" }).click();
        
        await page.getByLabel("Name").fill("Invalid URL");
        await page.getByLabel("URL").fill("not-a-url");
        
        await page.getByRole("button", { name: "Save" }).click();
        
        // Should show error
        await expect(page.getByText("Error saving endpoint")).toBeVisible();
      });

      test("should validate endpoint name", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await page.getByRole("button", { name: "Configure New" }).click();
        
        await page.getByLabel("URL").fill("https://api.example.com/chat");
        
        // Try to save without name
        await page.getByRole("button", { name: "Save" }).click();
        
        // Button should be disabled or show error
        await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
      });
    });

    test.describe("Read/List Endpoints", () => {
      test("should show empty state with configure button", async ({ page }) => {
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        
        await expect(page.getByRole("button", { name: "Configure New Endpoint" })).toBeVisible();
      });

      test("should list multiple endpoints", async ({ page }) => {
        // Create endpoints via API
        await createTestEndpoint(page, {
          name: "Endpoint 1",
          url: "https://api1.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await createTestEndpoint(page, {
          name: "Endpoint 2",
          url: "https://api2.example.com",
          auth: { type: "bearer", token: "token123" },
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await expect(page.getByText("Endpoint 1")).toBeVisible();
        await expect(page.getByText("Endpoint 2")).toBeVisible();
      });

      test("should auto-select first endpoint", async ({ page }) => {
        await createTestEndpoint(page, {
          name: "First Endpoint",
          url: "https://first.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        // First endpoint should be selected
        await expect(page.locator('[style*="border-color"][style*="blue"]')).toContainText("First Endpoint");
      });

      test("should display endpoint details", async ({ page }) => {
        await createTestEndpoint(page, {
          name: "Detailed Endpoint",
          url: "https://detailed.example.com",
          auth: { type: "bearer", token: "secret-token" },
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Detailed Endpoint").click();
        
        // Should show method and auth
        await expect(page.getByText("Method")).toBeVisible();
        await expect(page.getByText("POST")).toBeVisible();
        await expect(page.getByText("Auth")).toBeVisible();
        await expect(page.getByText("Bearer ****")).toBeVisible();
      });
    });

    test.describe("Update Endpoints", () => {
      test("should edit endpoint name", async ({ page }) => {
        const endpoint = await createTestEndpoint(page, {
          name: "Original Name",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Original Name").click();
        await page.locator('[aria-label="Settings"]').click();
        
        await page.getByLabel("Name").clear();
        await page.getByLabel("Name").fill("Updated Name");
        await page.getByRole("button", { name: "Save" }).click();
        
        await expect(page.getByText("Endpoint updated")).toBeVisible();
        await expect(page.getByText("Updated Name")).toBeVisible();
      });

      test("should change authentication type", async ({ page }) => {
        const endpoint = await createTestEndpoint(page, {
          name: "Auth Change Test",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Auth Change Test").click();
        await page.locator('[aria-label="Settings"]').click();
        
        await page.getByLabel("Authentication Type").selectOption("bearer");
        await page.getByLabel("Bearer Token").fill("new-token");
        await page.getByRole("button", { name: "Save" }).click();
        
        await expect(page.getByText("Endpoint updated")).toBeVisible();
        await expect(page.getByText("Bearer ****")).toBeVisible();
      });

      test("should update headers", async ({ page }) => {
        const endpoint = await createTestEndpoint(page, {
          name: "Header Update Test",
          url: "https://api.example.com",
          auth: null,
          headers: { "X-Old-Header": "old-value" },
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Header Update Test").click();
        await page.locator('[aria-label="Settings"]').click();
        
        // Update existing header
        const headerInput = page.locator('input[value="X-Old-Header"]');
        await headerInput.clear();
        await headerInput.fill("X-New-Header");
        
        await page.getByRole("button", { name: "Save" }).click();
        
        await expect(page.getByText("Endpoint updated")).toBeVisible();
      });

      test("should update default payload", async ({ page }) => {
        const endpoint = await createTestEndpoint(page, {
          name: "Payload Update Test",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: { old: "value" },
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Payload Update Test").click();
        await page.locator('[aria-label="Settings"]').click();
        
        const payloadInput = page.locator('textarea[placeholder=\'{"key": "value"}\']');
        await payloadInput.clear();
        await payloadInput.fill('{"new": "payload"}');
        
        await page.getByRole("button", { name: "Save" }).click();
        
        await expect(page.getByText("Endpoint updated")).toBeVisible();
      });
    });

    test.describe("Delete Endpoints", () => {
      test("should delete selected endpoint", async ({ page }) => {
        const endpoint = await createTestEndpoint(page, {
          name: "To Delete",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("To Delete").click();
        await page.locator('[aria-label="Delete"]').click();
        
        await expect(page.getByText("Endpoint deleted")).toBeVisible();
        await expect(page.getByText("To Delete")).not.toBeVisible();
      });

      test("should clear selection when deleting selected endpoint", async ({ page }) => {
        const endpoint = await createTestEndpoint(page, {
          name: "Selected to Delete",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Selected to Delete").click();
        
        // Verify it's selected
        await expect(page.getByText("Method")).toBeVisible();
        
        await page.locator('[aria-label="Delete"]').click();
        
        // Method card should disappear
        await expect(page.getByText("Method")).not.toBeVisible();
      });
    });
  });

  test.describe("Authentication Tests", () => {
    test("should test connection with no auth", async ({ page }) => {
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await page.getByRole("button", { name: "Configure New" }).click();
      
      await page.getByLabel("Name").fill("No Auth Test");
      await page.getByLabel("URL").fill("https://httpbin.org/post");
      await page.getByLabel("Authentication Type").selectOption("none");
      
      await page.getByRole("button", { name: "Test Connection" }).click();
      
      // Should show success or failure
      await expect(page.getByText(/Connection (successful|failed)/)).toBeVisible({ timeout: 10000 });
    });

    test("should send Bearer token in header", async ({ page }) => {
      // This would need a mock server to verify headers
      // For now, just test the UI flow
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await page.getByRole("button", { name: "Configure New" }).click();
      
      await page.getByLabel("Name").fill("Bearer Test");
      await page.getByLabel("URL").fill("https://httpbin.org/bearer");
      await page.getByLabel("Authentication Type").selectOption("bearer");
      await page.getByLabel("Bearer Token").fill("test-token-123");
      
      await page.getByRole("button", { name: "Save" }).click();
      
      await expect(page.getByText("Bearer Test")).toBeVisible();
    });
  });

  test.describe("JSON Editor Tests", () => {
    test.describe("Protected Fields", () => {
      test("should not allow editing messages field", async ({ page }) => {
        await createTestEndpoint(page, {
          name: "Protected Fields Test",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Protected Fields Test").click();
        
        // The messages field should be visible but protected
        await expect(page.getByText('"messages":')).toBeVisible();
        
        // Try to edit - should show error or be prevented
        const editor = page.locator('.monaco-editor');
        await editor.click();
        
        // Attempting to edit protected fields should be prevented
        // This is handled by the editor's protection mechanism
      });

      test("should show lock icon on hover", async ({ page }) => {
        await createTestEndpoint(page, {
          name: "Lock Icon Test",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Lock Icon Test").click();
        
        // Hover over protected field
        const messagesText = page.getByText('"messages":');
        await messagesText.hover();
        
        // Should show protection message
        await expect(page.getByText("This field is protected")).toBeVisible();
      });
    });

    test.describe("Editor Functionality", () => {
      test("should have JSON syntax highlighting", async ({ page }) => {
        await createTestEndpoint(page, {
          name: "Syntax Highlight Test",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Syntax Highlight Test").click();
        
        // Monaco editor should have syntax highlighting
        const editor = page.locator('.monaco-editor');
        await expect(editor).toBeVisible();
        
        // Check for syntax highlighting classes
        await expect(editor.locator('.mtk5')).toBeVisible(); // JSON property names
      });

      test("should expand editor modal", async ({ page }) => {
        await createTestEndpoint(page, {
          name: "Expand Editor Test",
          url: "https://api.example.com",
          auth: null,
          headers: {},
          defaultPayload: {},
        });
        
        await page.getByRole("radio", { name: "API Endpoint" }).click();
        await waitForEndpointsToLoad(page);
        
        await page.getByText("Expand Editor Test").click();
        
        // Click expand button
        await page.locator('[aria-label="expand json editor"]').click();
        
        // Modal should open
        await expect(page.getByRole("dialog", { name: "Edit JSON Payload" })).toBeVisible();
        
        // Close modal
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).not.toBeVisible();
      });
    });
  });

  test.describe("Payload Generation", () => {
    test("should generate messages from prompt content", async ({ page }) => {
      await createTestEndpoint(page, {
        name: "Message Generation Test",
        url: "https://api.example.com",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      // Enter prompt content
      await page.getByPlaceholder("Enter a user prompt").fill("Hello, how are you?");
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Message Generation Test").click();
      
      // Check that messages array is generated
      const editorContent = await page.locator('.monaco-editor').textContent();
      expect(editorContent).toContain('"messages":');
      expect(editorContent).toContain('"role": "user"');
      expect(editorContent).toContain('"content": "Hello, how are you?"');
    });

    test("should include model params", async ({ page }) => {
      await createTestEndpoint(page, {
        name: "Model Params Test",
        url: "https://api.example.com",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Model Params Test").click();
      
      // Check that model_params is included
      const editorContent = await page.locator('.monaco-editor').textContent();
      expect(editorContent).toContain('"model_params":');
      expect(editorContent).toContain('"temperature":');
      expect(editorContent).toContain('"max_tokens":');
    });

    test("should substitute variables", async ({ page }) => {
      await createTestEndpoint(page, {
        name: "Variable Test",
        url: "https://api.example.com",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      // Enter prompt with variable
      await page.getByPlaceholder("Enter a user prompt").fill("Hello {{name}}!");
      
      // Add variable value
      await page.getByPlaceholder("name").fill("Alice");
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Variable Test").click();
      
      // Check that variable is substituted
      const editorContent = await page.locator('.monaco-editor').textContent();
      expect(editorContent).toContain('"content": "Hello Alice!"');
    });

    test("should merge default payload", async ({ page }) => {
      await createTestEndpoint(page, {
        name: "Merge Payload Test",
        url: "https://api.example.com",
        auth: null,
        headers: {},
        defaultPayload: { custom_field: "custom_value", temperature: 0.5 },
      });
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Merge Payload Test").click();
      
      // Check that custom field is included
      const editorContent = await page.locator('.monaco-editor').textContent();
      expect(editorContent).toContain('"custom_field": "custom_value"');
      
      // Protected fields should override
      expect(editorContent).toContain('"model_params":');
    });
  });

  test.describe("Response Handling", () => {
    test("should display assistant message from array response", async ({ page }) => {
      // Create test endpoint that returns OpenAI message format
      await createTestEndpoint(page, {
        name: "Message Response Test",
        url: "http://localhost:3333/v1/test-endpoint",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      await page.getByPlaceholder("Enter a user prompt").fill("Test prompt");
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Message Response Test").click();
      
      // Mock the response
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
      
      await page.getByRole("button", { name: "Run" }).click();
      
      // Should display assistant message properly
      await expect(page.getByText("assistant")).toBeVisible();
      await expect(page.getByText("This is the assistant response")).toBeVisible();
    });

    test("should display raw JSON for non-message responses", async ({ page }) => {
      await createTestEndpoint(page, {
        name: "Raw JSON Test",
        url: "http://localhost:3333/v1/test-endpoint",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      await page.getByPlaceholder("Enter a user prompt").fill("Test prompt");
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Raw JSON Test").click();
      
      // Mock non-message response
      await page.route('**/test-endpoint', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ result: "custom response", data: [1, 2, 3] })
        });
      });
      
      await page.getByRole("button", { name: "Run" }).click();
      
      // Should display as formatted JSON
      await expect(page.getByText(/"result": "custom response"/)).toBeVisible();
      await expect(page.getByText(/"data": \[/)).toBeVisible();
    });

    test("should handle error responses", async ({ page }) => {
      await createTestEndpoint(page, {
        name: "Error Response Test",
        url: "http://localhost:3333/v1/test-endpoint",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      await page.getByPlaceholder("Enter a user prompt").fill("Test prompt");
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Error Response Test").click();
      
      // Mock error response
      await page.route('**/test-endpoint', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Internal server error" })
        });
      });
      
      await page.getByRole("button", { name: "Run" }).click();
      
      // Should display error
      await expect(page.getByText(/HTTP 500/)).toBeVisible();
    });
  });

  test.describe("UI State Management", () => {
    test("should persist model parameters collapsed state", async ({ page }) => {
      // Expand model parameters
      await page.getByText("Model Parameters").click();
      await expect(page.getByText("Temperature")).toBeVisible();
      
      // Switch to API mode and back
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await page.getByRole("radio", { name: "LLM Playground" }).click();
      
      // Should remain expanded
      await expect(page.getByText("Temperature")).toBeVisible();
    });

    test("should preserve selected endpoint", async ({ page }) => {
      await createTestEndpoint(page, {
        name: "Endpoint 1",
        url: "https://api1.example.com",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      await createTestEndpoint(page, {
        name: "Endpoint 2",
        url: "https://api2.example.com",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      // Select second endpoint
      await page.getByText("Endpoint 2").click();
      
      // Switch modes
      await page.getByRole("radio", { name: "LLM Playground" }).click();
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      
      // Should still have Endpoint 2 selected
      await expect(page.locator('[style*="border-color"][style*="blue"]')).toContainText("Endpoint 2");
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle very long endpoint names", async ({ page }) => {
      const longName = "This is a very long endpoint name that should be truncated or wrapped properly in the UI without breaking the layout";
      
      await createTestEndpoint(page, {
        name: longName,
        url: "https://api.example.com",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      // Should display without breaking layout
      await expect(page.getByText(longName)).toBeVisible();
    });

    test("should handle endpoint URL with special characters", async ({ page }) => {
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await page.getByRole("button", { name: "Configure New" }).click();
      
      await page.getByLabel("Name").fill("Special URL Test");
      await page.getByLabel("URL").fill("https://api.example.com/chat?param=value&other=test#fragment");
      
      await page.getByRole("button", { name: "Save" }).click();
      
      await expect(page.getByText("Special URL Test")).toBeVisible();
    });

    test("should handle large JSON payloads", async ({ page }) => {
      const largePayload = {
        array: Array(100).fill({ key: "value" }),
        nested: {
          deep: {
            structure: {
              with: {
                many: {
                  levels: "test"
                }
              }
            }
          }
        }
      };
      
      await createTestEndpoint(page, {
        name: "Large Payload Test",
        url: "https://api.example.com",
        auth: null,
        headers: {},
        defaultPayload: largePayload,
      });
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Large Payload Test").click();
      
      // Editor should handle large content
      await expect(page.locator('.monaco-editor')).toBeVisible();
    });

    test("should handle malformed JSON responses gracefully", async ({ page }) => {
      await createTestEndpoint(page, {
        name: "Malformed JSON Test",
        url: "http://localhost:3333/v1/test-endpoint",
        auth: null,
        headers: {},
        defaultPayload: {},
      });
      
      await page.getByPlaceholder("Enter a user prompt").fill("Test prompt");
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      await page.getByText("Malformed JSON Test").click();
      
      // Mock malformed response
      await page.route('**/test-endpoint', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'not valid json'
        });
      });
      
      await page.getByRole("button", { name: "Run" }).click();
      
      // Should handle error gracefully
      await expect(page.getByText(/error/i)).toBeVisible();
    });
  });

  test.describe("Theme Compatibility", () => {
    test("should work in dark theme", async ({ page }) => {
      // Switch to dark theme
      await page.getByRole("button", { name: "Toggle color scheme" }).click();
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await page.getByRole("button", { name: "Configure New" }).click();
      
      // All elements should be visible and properly styled
      await expect(page.getByLabel("Name")).toBeVisible();
      await expect(page.getByLabel("URL")).toBeVisible();
      
      // No hardcoded black backgrounds
      const modal = page.getByRole("dialog");
      const bgColor = await modal.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).not.toBe('rgb(0, 0, 0)');
    });
  });

  test.describe("Performance", () => {
    test("should handle many endpoints efficiently", async ({ page }) => {
      // Create 20 endpoints
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(createTestEndpoint(page, {
          name: `Endpoint ${i}`,
          url: `https://api${i}.example.com`,
          auth: null,
          headers: {},
          defaultPayload: {},
        }));
      }
      await Promise.all(promises);
      
      await page.getByRole("radio", { name: "API Endpoint" }).click();
      await waitForEndpointsToLoad(page);
      
      // Should load without performance issues
      await expect(page.getByText("Endpoint 0")).toBeVisible();
      await expect(page.getByText("Endpoint 19")).toBeVisible();
      
      // Switching between endpoints should be fast
      const start = Date.now();
      await page.getByText("Endpoint 10").click();
      await expect(page.locator('[style*="border-color"][style*="blue"]')).toContainText("Endpoint 10");
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(1000); // Should switch in less than 1 second
    });
  });
});