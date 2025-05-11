import { test, expect } from '@playwright/test';

// Basic smoke test: page loads, core buttons render, swap button disabled when contracts not yet deployed.

test('homepage loads and UI renders', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Expect title to contain project name
  await expect(page).toHaveTitle(/Trading Bot Chef|Crypto Trading Bot/i);

  // Connect Wallet button visible
  const connectBtn = page.getByRole('button', { name: /connect wallet/i });
  await expect(connectBtn).toBeVisible();

  // Execute Trade button visible
  const tradeBtn = page.locator('#execute-trade-btn');
  await expect(tradeBtn).toBeVisible();

  // Open modal and ensure swap execute button disabled by default
  await tradeBtn.click();
  const execSwapBtn = page.locator('#execute-swap-btn');
  await expect(execSwapBtn).toBeDisabled();
}); 