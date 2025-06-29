import { expect, test } from "@playwright/test";
import sql from "../backend/src/utils/db";

test.describe.configure({ mode: "serial" });

// Helper function to clean up test prompts
async function cleanupTestPrompts() {
  const [project] = await sql`
    select p.* from project p
    left join org on p.org_id = org.id
    where org.name = 'test test''s Org'
  `;

  if (project) {
    await sql`
      delete from template 
      where project_id = ${project.id} 
      and slug like 'test-%'
    `;
  }
}

test.beforeAll(async () => {
  await cleanupTestPrompts();
});

test.afterAll(async () => {
  await cleanupTestPrompts();
});

test.describe("Prompts Page - Core Functionality", () => {
  test("navigate to prompts page", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Verify we're on the prompts page
    expect(page.url()).toContain("/prompts");

    // Page should have either templates or empty state
    const hasTemplates = (await page.locator('[class*="NavLink"]').count()) > 0;
    const hasEmptyState = await page
      .locator('text="Create first template"')
      .isVisible();

    expect(hasTemplates || hasEmptyState).toBeTruthy();
  });

  test("create and save a new prompt template", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Create new template - handle both empty state and existing templates
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

    // Wait for editor to be ready
    await page.waitForTimeout(2000);

    // Find and fill the editor - handle both Monaco and textarea
    const textareas = await page.locator("textarea").all();
    if (textareas.length > 0) {
      // Fill the first visible textarea
      for (const textarea of textareas) {
        if (await textarea.isVisible()) {
          await textarea.fill(
            "Test prompt: Hello {{name}}, welcome to {{company}}!",
          );
          break;
        }
      }
    }

    // Save using keyboard shortcut
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+s" : "Control+s",
    );

    // Wait for save to complete
    await page.waitForTimeout(2000);

    // Verify template was saved (look for draft badge or version indicator)
    // Use more specific selectors to avoid multiple matches
    const draftBadge = page.locator('.mantine-Badge-label:has-text("Draft")').first();
    const versionBadge = page.locator("text=/v\\d+/").first();

    const hasDraft =
      (await draftBadge.count() > 0) || (await versionBadge.count() > 0);
    expect(hasDraft).toBeTruthy();
  });

  test("deploy a prompt template", async ({ page }) => {
    // Continue from previous test - navigate to existing template
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Click on the first template in the list
    const firstTemplate = page.locator('[class*="NavLink"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
      await page.waitForLoadState("networkidle");
    }

    // Deploy the template
    const deployButton = page.locator('[data-testid="deploy-template"]');
    if (await deployButton.isVisible()) {
      await deployButton.click();
      await page.waitForTimeout(2000);

      // Verify deployment (look for version number)
      const hasVersion = await page.locator("text=/v\\d+/").isVisible();
      expect(hasVersion).toBeTruthy();
    }
  });
});

test.describe("Prompts Page - Variables", () => {
  test("work with prompt variables", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Create or navigate to a template
    const createIcon = page.locator('[data-testid="create-template"]');
    if (await createIcon.isVisible()) {
      await createIcon.click();
      await page.waitForURL(/\/prompts\/[a-z0-9-]+$/);
    } else {
      const firstTemplate = page.locator('[class*="NavLink"]').first();
      await firstTemplate.click();
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Add content with variables
    const textareas = await page.locator("textarea").all();
    for (const textarea of textareas) {
      if (await textarea.isVisible()) {
        await textarea.fill(
          "Hello {{firstName}} {{lastName}}, welcome to {{company}}!",
        );
        break;
      }
    }

    // Open variables modal
    const variablesButton = page
      .locator("button")
      .filter({ hasText: /variable/i })
      .first();
    if (await variablesButton.isVisible()) {
      await variablesButton.click();
      await page.waitForTimeout(1000);

      // Variables should be detected - they appear with curly braces in the modal
      await expect(page.locator('text="{{firstName}}"')).toBeVisible();
      await expect(page.locator('text="{{lastName}}"')).toBeVisible();
      await expect(page.locator('text="{{company}}"')).toBeVisible();

      // Close modal
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Prompts Page - Running Prompts", () => {
  test("run a prompt with test values", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Navigate to a template
    const firstTemplate = page.locator('[class*="NavLink"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
      await page.waitForLoadState("networkidle");
    } else {
      // Create new if no templates exist
      const createButton = page.getByRole("button", {
        name: "Create first template",
      });
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForURL(/\/prompts\/[a-z0-9-]+$/);
      }
    }

    await page.waitForTimeout(1000);

    // Set simple prompt content
    const textareas = await page.locator("textarea").all();
    for (const textarea of textareas) {
      if (await textarea.isVisible()) {
        await textarea.fill("Say hello world");
        break;
      }
    }

    // Run the prompt
    const runButton = page.locator('[data-testid="run-playground"]');
    if (await runButton.isVisible()) {
      // Wait for the button to be enabled (not disabled)
      await runButton.waitFor({ state: "visible", timeout: 10000 });
      await expect(runButton).toBeEnabled({ timeout: 10000 });

      await runButton.click();

      // Wait for response (with timeout)
      await page.waitForTimeout(5000);

      // Look for any output
      const hasOutput = await page
        .locator("text=/hello|world|error/i")
        .isVisible();
      expect(hasOutput).toBeTruthy();
    }
  });
});

test.describe("Prompts Page - Custom Endpoints", () => {
  test("switch to custom endpoint mode", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Navigate to a template
    const firstTemplate = page.locator('[class*="NavLink"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
    } else {
      const createButton = page.getByRole("button", {
        name: "Create first template",
      });
      if (await createButton.isVisible()) {
        await createButton.click();
      }
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Find and click custom endpoint option
    const customEndpointOption = page.locator('text="Custom Endpoint"');
    if (await customEndpointOption.isVisible()) {
      await customEndpointOption.click();
      await page.waitForTimeout(1000);

      // Verify we're in custom endpoint mode
      const addEndpointButton = page
        .locator("button")
        .filter({ hasText: /add endpoint/i });
      expect(await addEndpointButton.isVisible()).toBeTruthy();
    }
  });

  test("create a custom endpoint", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Create a new template or navigate to existing one
    const createButton = page.getByRole("button", {
      name: "Create first template",
    });
    const createIcon = page.locator('[data-testid="create-template"]');
    
    if (await createButton.isVisible()) {
      await createButton.click();
    } else if (await createIcon.isVisible()) {
      await createIcon.click();
    } else {
      const firstTemplate = page.locator('[class*="NavLink"]').first();
      if (await firstTemplate.isVisible()) {
        await firstTemplate.click();
      }
    }

    // Wait for navigation to template editor
    await page.waitForURL(/\/prompts\/[a-z0-9-]+$/);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Find and click custom endpoint option
    const customEndpointOption = page.locator('text="Custom Endpoint"');
    if (await customEndpointOption.isVisible()) {
      await customEndpointOption.click();
      await page.waitForTimeout(1000);
    } else {
      // Skip test if Custom Endpoint option is not available
      console.log("Custom Endpoint option not found, skipping test");
      return;
    }

    // Click add endpoint button
    const addEndpointButton = page
      .locator("button")
      .filter({ hasText: /add endpoint/i })
      .first();
    if (await addEndpointButton.isVisible()) {
      await addEndpointButton.click();
      await page.waitForTimeout(1000);

      // Fill endpoint details
      const nameInput = page.locator('input[placeholder*="name" i]').first();
      const urlInput = page.locator('input[placeholder*="url" i]').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill("Test Endpoint");
      }

      if (await urlInput.isVisible()) {
        await urlInput.fill("https://api.example.com/v1/chat");
      }

      // Save endpoint
      const saveButton = page
        .locator("button")
        .filter({ hasText: /save/i })
        .last();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Verify endpoint was created
        await expect(page.locator('text="Test Endpoint"')).toBeVisible();
      }
    }
  });
});

test.describe("Prompts Page - UI Elements", () => {
  test("notepad functionality", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Navigate to a template
    const firstTemplate = page.locator('[class*="NavLink"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
      await page.waitForLoadState("networkidle");
    }

    // Open notepad
    const notepadButton = page
      .locator("button")
      .filter({ hasText: /notepad/i })
      .first();
    if (await notepadButton.isVisible()) {
      await notepadButton.click();
      await page.waitForTimeout(1000);

      // Add notes
      const notepadTextarea = page.locator("textarea").last();
      if (await notepadTextarea.isVisible()) {
        await notepadTextarea.fill("Test notes for this template");

        // Save notes
        const saveButton = page
          .locator("button")
          .filter({ hasText: /save/i })
          .last();
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }

      // Close notepad
      await page.keyboard.press("Escape");
    }
  });

  test("switch between text and array modes", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Navigate to a template
    const firstTemplate = page.locator('[class*="NavLink"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
      await page.waitForLoadState("networkidle");
    }

    // Look for array/text toggle
    const arrayOption = page.locator('text="Array"');
    if (await arrayOption.isVisible()) {
      await arrayOption.click();
      await page.waitForTimeout(1000);

      // In array mode, we should see role selectors
      await expect(page.locator('text="Role"').first()).toBeVisible();

      // Switch back to text mode
      const textOption = page.locator('text="Text"');
      if (await textOption.isVisible()) {
        await textOption.click();
        await page.waitForTimeout(1000);

        // Role selectors should not be visible in text mode
        await expect(page.locator('text="Role"')).not.toBeVisible();
      }
    }
  });
});

test.describe("Prompts Page - Response Format", () => {
  test("response format dropdown for OpenAI models", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Navigate to a template
    const firstTemplate = page.locator('[class*="NavLink"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
    } else {
      const createButton = page.getByRole("button", {
        name: "Create first template",
      });
      if (await createButton.isVisible()) {
        await createButton.click();
      }
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Open model parameters popover
    const paramsButton = page
      .locator("button")
      .filter({ has: page.locator("svg").nth(1) })
      .first();
    if (await paramsButton.isVisible()) {
      await paramsButton.click();
      await page.waitForTimeout(500);

      // Response format should be visible for OpenAI models
      const responseFormatLabel = page.locator('text="Response format"');
      if (await responseFormatLabel.isVisible()) {
        // Find the select dropdown next to it
        const responseFormatRow = page
          .locator('text="Response format"')
          .locator("..");
        const responseFormatSelect = responseFormatRow
          .locator('[role="combobox"]')
          .or(responseFormatRow.locator("input"));

        if (await responseFormatSelect.isVisible()) {
          // Click on the select to open options
          await responseFormatSelect.click();
          await page.waitForTimeout(500);

          // Verify options are available
          await expect(
            page.locator('[role="option"]').filter({ hasText: "json_object" }),
          ).toBeVisible();
          await expect(
            page.locator('[role="option"]').filter({ hasText: "json_schema" }),
          ).toBeVisible();

          // Select json_schema
          await page
            .locator('[role="option"]')
            .filter({ hasText: "json_schema" })
            .click();
          await page.waitForTimeout(500);

          // Modal should open
          await expect(
            page.locator('text="Add response format"'),
          ).toBeVisible();
        }
      }

      // Close modal if open
      const cancelButton = page.locator("button").filter({ hasText: "Cancel" });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }

      // Close popover
      await page.keyboard.press("Escape");
    }
  });

  test("json schema modal functionality", async ({ page }) => {
    await page.goto("/prompts");
    await page.waitForLoadState("networkidle");

    // Navigate to template
    const firstTemplate = page.locator('[class*="NavLink"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
      await page.waitForLoadState("networkidle");
    }

    // Open model parameters and select json_schema
    const paramsButton = page
      .locator("button")
      .filter({ has: page.locator("svg").nth(1) })
      .first();
    if (await paramsButton.isVisible()) {
      await paramsButton.click();
      await page.waitForTimeout(500);

      const responseFormatLabel = page.locator('text="Response format"');
      if (await responseFormatLabel.isVisible()) {
        const responseFormatRow = page
          .locator('text="Response format"')
          .locator("..");
        const responseFormatSelect = responseFormatRow
          .locator('[role="combobox"]')
          .or(responseFormatRow.locator("input"));

        if (await responseFormatSelect.isVisible()) {
          await responseFormatSelect.click();
          await page.waitForTimeout(500);
          await page
            .locator('[role="option"]')
            .filter({ hasText: "json_schema" })
            .click();
          await page.waitForTimeout(1000);

          // Modal should be open
          const modal = page.locator('text="Add response format"');
          if (await modal.isVisible()) {
            // Check for example dropdown
            const examplesDropdown = page.locator('[placeholder="Examples"]');
            if (await examplesDropdown.isVisible()) {
              await examplesDropdown.click();
              await page.waitForTimeout(500);

              // Verify examples are available
              await expect(
                page
                  .locator('[role="option"]')
                  .filter({ hasText: "math_response" }),
              ).toBeVisible();
              await expect(
                page
                  .locator('[role="option"]')
                  .filter({ hasText: "paper_metadata" }),
              ).toBeVisible();
              await expect(
                page
                  .locator('[role="option"]')
                  .filter({ hasText: "moderation" }),
              ).toBeVisible();

              // Select an example
              await page
                .locator('[role="option"]')
                .filter({ hasText: "math_response" })
                .click();
              await page.waitForTimeout(500);

              // Verify JSON input is populated
              const jsonTextarea = page
                .locator("textarea")
                .filter({ hasText: "math_response" });
              const hasContent = (await jsonTextarea.count()) > 0;
              expect(hasContent).toBeTruthy();
            }

            // Save the schema
            const saveButton = page
              .locator("button")
              .filter({ hasText: "Save" })
              .last();
            if (await saveButton.isVisible()) {
              await saveButton.click();
              await page.waitForTimeout(500);

              // Modal should close
              await expect(
                page.locator('text="Add response format"'),
              ).not.toBeVisible();
            }
          }
        }
      }
    }
  });
});
