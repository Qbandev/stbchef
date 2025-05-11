const { devices } = require('@playwright/test');
const path = require('path');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  timeout: 60_000,
  testDir: path.join(__dirname, 'e2e'),
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'poetry run python -m src.web.app',
    port: 8080,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
};

module.exports = config; 