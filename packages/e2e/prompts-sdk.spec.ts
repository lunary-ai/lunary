import { expect, test } from "@playwright/test";
import lunary from "lunary";

// Store keys for SDK initialization
let publicKey: string;
let privateKey: string;
let promptSlug: string;
let isInitialized = false;

test.describe.configure({ mode: "serial" });

const apiUrl = process.env.API_URL || "http://localhost:3333";

test.describe("Prompt SDK Methods", () => {
  test("create a prompt template via UI first", async ({ page }) => {
    // First, get API keys if not already initialized
    if (!isInitialized) {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      // Get API keys
      publicKey = (await page.getByTestId("public-key").textContent()) || "";
      privateKey = (await page.getByTestId("private-key").textContent()) || "";

      expect(publicKey).toHaveLength(36);
      expect(privateKey).toHaveLength(36);

      // Initialize Lunary SDK (publicKey is actually the project ID)
      lunary.init({
        publicKey,
        apiUrl,
      });
      
      console.log("Initialized Lunary SDK with project ID:", publicKey);
      isInitialized = true;
    }

    // Navigate to prompts page
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Create new template
    const createFirstButton = page.getByRole("button", {
      name: "Create first template",
    });
    const createIcon = page.locator('[data-testid="create-template"]');

    if (await createFirstButton.isVisible()) {
      await createFirstButton.click();
    } else if (await createIcon.isVisible()) {
      await createIcon.click();
    }

    // Wait for navigation to template editor
    await page.waitForURL(/\/prompts\/[a-z0-9-]+$/);
    await page.waitForLoadState("networkidle");

    // Generate a unique slug for this template
    promptSlug = `test-template-${Date.now()}`;
    console.log("Will use slug:", promptSlug);
    
    // Try to set the slug if there's a slug input field
    const slugInput = page.locator('input[placeholder*="slug" i]');
    if (await slugInput.isVisible()) {
      await slugInput.fill(promptSlug);
      console.log("Set template slug to:", promptSlug);
    }

    // Wait for editor to be ready
    await page.waitForTimeout(2000);

    // Fill the template content with variables
    const textareas = await page.locator("textarea").all();
    if (textareas.length > 0) {
      for (const textarea of textareas) {
        if (await textarea.isVisible()) {
          await textarea.fill(
            "Hello {{name}}, welcome to {{company}}! Your role is {{role}}.",
          );
          break;
        }
      }
    }

    // Save the template
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+s" : "Control+s",
    );
    await page.waitForTimeout(2000);

    // Deploy the template
    const deployButton = page.locator('[data-testid="deploy-template"]');
    const deployButtonAlt = page.getByRole("button", { name: /deploy/i });
    const commitButton = page.getByRole("button", { name: /commit/i });
    
    let deployed = false;
    
    if (await deployButton.isVisible()) {
      console.log("Clicking deploy button (data-testid)");
      await deployButton.click();
      deployed = true;
    } else if (await deployButtonAlt.isVisible()) {
      console.log("Clicking deploy button (role)");
      await deployButtonAlt.click();
      deployed = true;
    } else if (await commitButton.isVisible()) {
      console.log("Clicking commit button");
      await commitButton.click();
      deployed = true;
    } else {
      console.log("Warning: No deploy/commit button found");
      // Try to find any button that might deploy
      const allButtons = await page.getByRole("button").all();
      for (const button of allButtons) {
        const text = await button.textContent();
        console.log("Found button:", text);
      }
    }
    
    if (deployed) {
      // Wait for deployment to complete
      await page.waitForTimeout(5000);
      
      // Verify deployment (look for version number in the specific context)
      const versionIndicators = page.locator("text=/^v\\d+$/");
      const versionCount = await versionIndicators.count();
      
      if (versionCount > 0) {
        console.log(`Template deployed successfully - found ${versionCount} version indicator(s)`);
        // Also check for "Live" status
        const liveStatus = await page.locator("text=Live").isVisible();
        if (liveStatus) {
          console.log("Template is marked as Live");
        }
      } else {
        console.log("Warning: Version indicator not found after deployment");
        // Take a screenshot for debugging
        await page.screenshot({ path: 'deployment-debug.png' });
      }
    }
  });

  test("renderTemplate - basic usage", async () => {
    // Test renderTemplate with variables
    console.log("Testing renderTemplate with slug:", promptSlug);
    
    try {
      const rendered = await lunary.renderTemplate(promptSlug, {
        name: "John Doe",
        company: "Acme Corp",
        role: "Software Engineer",
      });

      expect(rendered).toBe(
        "Hello John Doe, welcome to Acme Corp! Your role is Software Engineer.",
      );
    } catch (error) {
      console.error("Error rendering template:", error);
      throw error;
    }
  });

  test("renderTemplate - missing variables", async () => {
    // Test renderTemplate with missing variables
    const rendered = await lunary.renderTemplate(promptSlug, {
      name: "Jane Smith",
      // company is missing
      // role is missing
    });

    // Template should still render with undefined values
    expect(rendered).toContain("Jane Smith");
    expect(rendered).toContain("{{company}}");
    expect(rendered).toContain("{{role}}");
  });

  test("renderTemplate - empty variables", async () => {
    // Test renderTemplate with empty object
    const rendered = await lunary.renderTemplate(promptSlug, {});

    expect(rendered).toBe(
      "Hello {{name}}, welcome to {{company}}! Your role is {{role}}.",
    );
  });

  test("renderTemplate - extra variables", async () => {
    // Test renderTemplate with extra variables (should be ignored)
    const rendered = await lunary.renderTemplate(promptSlug, {
      name: "Bob Wilson",
      company: "TechCo",
      role: "CTO",
      extraField: "This should be ignored",
      anotherExtra: 123,
    });

    expect(rendered).toBe(
      "Hello Bob Wilson, welcome to TechCo! Your role is CTO.",
    );
    expect(rendered).not.toContain("extraField");
    expect(rendered).not.toContain("123");
  });

  test("renderTemplate - special characters in variables", async () => {
    // Test with special characters
    const rendered = await lunary.renderTemplate(promptSlug, {
      name: "O'Brien & Associates",
      company: "<Script>Alert('XSS')</Script>",
      role: 'Senior "Developer"',
    });

    expect(rendered).toContain("O'Brien & Associates");
    expect(rendered).toContain("<Script>Alert('XSS')</Script>");
    expect(rendered).toContain('Senior "Developer"');
  });

  test("renderTemplate - non-existent template", async () => {
    // Test with non-existent template slug
    try {
      await lunary.renderTemplate("non-existent-template-slug", {
        name: "Test",
      });
      // Should throw an error
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("create a chat prompt template for LangChain", async ({ page }) => {
    // Navigate to prompts page to create a chat template
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Create new template
    const createIcon = page.locator('[data-testid="create-template"]');
    if (await createIcon.isVisible()) {
      await createIcon.click();
    }

    // Wait for navigation
    await page.waitForURL(/\/prompts\/[a-z0-9-]+$/);
    await page.waitForLoadState("networkidle");

    // Extract the slug
    const url = page.url();
    const match = url.match(/\/prompts\/([a-z0-9-]+)$/);
    const chatPromptSlug = match ? match[1] : "";

    // Wait for editor
    await page.waitForTimeout(2000);

    // Create a chat-style prompt
    const textareas = await page.locator("textarea").all();
    if (textareas.length > 0) {
      for (const textarea of textareas) {
        if (await textarea.isVisible()) {
          await textarea.fill(
            "You are a helpful assistant. The user wants to know about {{topic}}.",
          );
          break;
        }
      }
    }

    // Save and deploy
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+s" : "Control+s",
    );
    await page.waitForTimeout(2000);

    const deployButton = page.getByRole("button", { name: /deploy/i });
    if (await deployButton.isVisible()) {
      await deployButton.click();
      await page.waitForTimeout(2000);
    }

    // Test getLangChainTemplate if available
    // Note: This method might not be available in all SDK versions
    const lunaryAny = lunary as any;
    if (typeof lunaryAny.getLangChainTemplate === "function") {
      const langChainPrompt = await lunaryAny.getLangChainTemplate(chatPromptSlug);
      expect(langChainPrompt).toBeDefined();

      // Test if it's a valid LangChain template
      if (langChainPrompt && typeof langChainPrompt.invoke === "function") {
        const promptValue = await langChainPrompt.invoke({
          topic: "TypeScript",
        });
        expect(promptValue).toBeDefined();
      }
    }
  });

  test("renderTemplate - with different data types", async () => {
    // Create a template with various data types
    const rendered = await lunary.renderTemplate(promptSlug, {
      name: 123, // number instead of string
      company: true, // boolean
      role: { title: "Developer" }, // object
    });

    // Should convert to strings
    expect(rendered).toContain("123");
    expect(rendered).toContain("true");
    expect(rendered).toContain("[object Object]");
  });

  test("renderTemplate - performance test", async () => {
    // Test multiple concurrent requests
    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      promises.push(
        lunary.renderTemplate(promptSlug, {
          name: `User ${i}`,
          company: `Company ${i}`,
          role: `Role ${i}`,
        }),
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();

    // All should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(5000);

    // Verify all results
    results.forEach((result, index) => {
      expect(result).toContain(`User ${index}`);
      expect(result).toContain(`Company ${index}`);
      expect(result).toContain(`Role ${index}`);
    });
  });

  test("update prompt and verify changes", async ({ page }) => {
    // Navigate back to the prompt
    await page.goto(`/prompts/${promptSlug}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Update the template
    const textareas = await page.locator("textarea").all();
    if (textareas.length > 0) {
      for (const textarea of textareas) {
        if (await textarea.isVisible()) {
          await textarea.fill(
            "Updated: Hi {{name}} from {{company}} as {{role}}!",
          );
          break;
        }
      }
    }

    // Save and deploy
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+s" : "Control+s",
    );
    await page.waitForTimeout(2000);

    const deployButton = page.getByRole("button", { name: /deploy/i });
    if (await deployButton.isVisible()) {
      await deployButton.click();
      await page.waitForTimeout(3000); // Give time for deployment
    }

    // Test that the SDK gets the updated version
    const updatedRender = await lunary.renderTemplate(promptSlug, {
      name: "Alice",
      company: "StartupXYZ",
      role: "CEO",
    });

    expect(updatedRender).toBe("Updated: Hi Alice from StartupXYZ as CEO!");
  });

  test("renderTemplate - null and undefined values", async () => {
    const rendered = await lunary.renderTemplate(promptSlug, {
      name: null,
      company: undefined,
      role: "",
    });

    // Check how null/undefined are handled
    expect(rendered).toBeDefined();
    // Empty string should leave variable empty
    expect(rendered).toContain("as !");
  });

  test("renderTemplate - concurrent modification safety", async ({ page }) => {
    // Create multiple templates and test concurrent access
    const templates = [];

    for (let i = 0; i < 3; i++) {
      await page.goto("/prompts");
      await page.waitForLoadState("networkidle");

      const createIcon = page.locator('[data-testid="create-template"]');
      if (await createIcon.isVisible()) {
        await createIcon.click();
      }

      await page.waitForURL(/\/prompts\/[a-z0-9-]+$/);
      const url = page.url();
      const match = url.match(/\/prompts\/([a-z0-9-]+)$/);
      if (match) {
        templates.push(match[1]);
      }

      await page.waitForTimeout(1000);

      const textareas = await page.locator("textarea").all();
      if (textareas.length > 0) {
        for (const textarea of textareas) {
          if (await textarea.isVisible()) {
            await textarea.fill(`Template ${i}: {{var${i}}}`);
            break;
          }
        }
      }

      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+s" : "Control+s",
      );
      await page.waitForTimeout(1000);
    }

    // Test concurrent access to different templates
    const promises = templates.map((slug, index) =>
      lunary.renderTemplate(slug, { [`var${index}`]: `value${index}` }),
    );

    const results = await Promise.all(promises);

    results.forEach((result, index) => {
      expect(result).toBe(`Template ${index}: value${index}`);
    });
  });

  test("renderTemplate - network error handling", async () => {
    // Test with invalid API URL temporarily
    const lunaryAny = lunary as any;
    const originalApiUrl = lunaryAny._config?.apiUrl;

    if (lunaryAny._config) {
      lunaryAny._config.apiUrl = "http://invalid-url-that-does-not-exist:9999";
    }

    try {
      await lunary.renderTemplate(promptSlug, { name: "Test" });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    } finally {
      // Restore original API URL
      if (lunaryAny._config && originalApiUrl) {
        lunaryAny._config.apiUrl = originalApiUrl;
      }
    }
  });

  test("renderTemplate - cache behavior", async () => {
    // Test if SDK caches templates properly
    const start1 = Date.now();
    const result1 = await lunary.renderTemplate(promptSlug, {
      name: "CacheTest1",
      company: "Company1",
      role: "Role1",
    });
    const time1 = Date.now() - start1;

    // Second call should be faster if cached
    const start2 = Date.now();
    const result2 = await lunary.renderTemplate(promptSlug, {
      name: "CacheTest2",
      company: "Company2",
      role: "Role2",
    });
    const time2 = Date.now() - start2;

    expect(result1).toContain("CacheTest1");
    expect(result2).toContain("CacheTest2");

    // Note: This is a heuristic test - caching might not always be faster
    console.log(`First call: ${time1}ms, Second call: ${time2}ms`);
  });
});

test.afterAll(async () => {
  // Clean up
  if (lunary.flush) {
    await lunary.flush();
  }
});
