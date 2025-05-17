// playwright/tests/openai-lunary.spec.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
test.use({ storageState: '.auth/user.json' });
// External script that runs the OpenAI + Lunary logic
test('extract public key from settings and run OpenAI completion', async ({ page }) => {
  // 1. Go to settings page
  await page.goto('/settings');

  // 2. Wait for public key field and extract its value
  const publicKeyElement = await page.getByTestId('public-key');
  const publicKey = await publicKeyElement.innerText();
  expect(publicKey).toBeTruthy();

  // 4. Run the script using the extracted public key
  const result = execSync(`node ../helpers/run-openai.ts ${publicKey}`, {
    encoding: 'utf-8',
  });


});
